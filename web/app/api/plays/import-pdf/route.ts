import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TextractClient, DetectDocumentTextCommand, type Block } from "@aws-sdk/client-textract";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { createNewPlay, savePlayScript } from "@/lib/actions/plays";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;
const TEXTRACT_BATCH = 5; // parallel Textract calls per batch

// ─── SSF prompts ──────────────────────────────────────────────────────────────

// Used when the PDF has embedded text (pdf-parse) or OCR text (Textract).
// No vision tokens — just text reformatting.
const SSF_TEXT_PROMPT = `You are converting the extracted text of a theatrical play into Souffleur Script Format (SSF).
The text was extracted from a PDF and may contain artifacts: page numbers, running headers/footers, column-order issues in multi-column layouts. Correct these as you convert.

## SSF Syntax

// comment (stripped)
# Act I                        → act header
## Scene 1: Description        → scene header with optional subtitle
(Stage direction)              → standalone stage direction on its own line
@CHARACTER                     → character cue; dialogue follows on the next line
@CHARACTER (aside)             → character cue with inline direction
Dialogue text                  → body text following a @CHARACTER cue
(inline action) more dialogue  → inline stage direction within a dialogue line
---                            → explicit scene break / curtain

## Rules

1. Output ONLY valid SSF. No explanation, no markdown code fences, no preamble.
2. The FIRST LINE must be exactly: // title: <play title>. Do NOT repeat it as a # heading.
3. The SECOND LINE must be exactly: // author: <author name, or omit if not found>
4. Character names: UPPERCASE, preceded by @. Preserve exact spelling from the source.
5. Strip all of: page numbers, running headers/footers, margin line numbers, footnotes, ISBN/copyright blocks.
6. Character cues are typically UPPERCASE followed by a colon — identify them even without visual formatting.
7. Stage directions are often in parentheses or set apart from dialogue — preserve them as (direction).
8. Do NOT invent dialogue. Transcribe only what is in the text.
9. Output the complete play from beginning to end.
10. CAST LIST: Any section titled "Personnages", "Characters", "Cast", "Dramatis Personae", "Liste des personnages", or similar — DO NOT output it as a # heading or include the character list at all. Skip the entire section. # headings are only for acts, ## headings only for scenes.

Convert the extracted text now.`;

// Used when no text can be extracted (scanned PDF, no AWS credentials).
// Sends the PDF as a base64 document to Claude Vision.
const SSF_VISION_PROMPT = `You are converting a theatrical play PDF into Souffleur Script Format (SSF).

## SSF Syntax

// comment (stripped)
# Act I                        → act header
## Scene 1: Description        → scene header with optional subtitle
(Stage direction)              → standalone stage direction on its own line
@CHARACTER                     → character cue; dialogue follows on the next line
@CHARACTER (aside)             → character cue with inline direction
Dialogue text                  → body text following a @CHARACTER cue
(inline action) more dialogue  → inline stage direction within a dialogue line
---                            → explicit scene break / curtain

## Rules

1. Output ONLY valid SSF. No explanation, no markdown code fences, no preamble.
2. The FIRST LINE must be exactly: // title: <play title as printed on the cover or title page>. Do NOT repeat the title as a # heading anywhere in the output.
3. The SECOND LINE must be exactly: // author: <author name as printed, or omit line entirely if not found>
4. Character names: UPPERCASE, preceded by @. Preserve the exact spelling from the PDF.
5. Strip all of: page numbers, running headers/footers, margin line numbers, editor footnotes, ISBN/copyright blocks, printer marks.
6. CAST LIST: Any section titled "Personnages", "Characters", "Cast", "Dramatis Personae", "Liste des personnages", "Interprètes", or similar — DO NOT output it as a # heading or include the character names list at all. Skip the entire section. # headings are reserved for acts only, ## headings for scenes only.
7. Use // [illegible] where text is unreadable.
8. Use // [content missing or unclear] if pages appear to be absent.
9. Multi-character simultaneous speech: @LABEL:CHAR1+CHAR2
9. Do NOT invent dialogue. Transcribe only what is printed in the PDF.
10. Output the complete play from beginning to end.

Convert the attached PDF now.`;

export const maxDuration = 300;

function sseEvent(obj: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

// Count physical pages using pdf-lib (handles compressed cross-reference streams / PDF 1.5+).
// Falls back to raw regex for malformed or encrypted PDFs that pdf-lib cannot parse.
async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    const text = buffer.toString("latin1");
    const matches = text.match(/\/Type\s*\/Page\b(?!s)/g);
    if (matches && matches.length > 0) return matches.length;
    const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => parseInt(m[1], 10));
    return counts.length ? Math.max(...counts) : 0;
  }
}

// Try to extract embedded text from a text-based PDF (free, instant, no AI).
// Scanned PDFs yield only a few bytes of metadata noise; text PDFs yield thousands of chars.
async function extractEmbeddedText(buffer: Buffer): Promise<string | null> {
  try {
    // Import via internal path to skip pdf-parse's test-fixture loading at module init
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
      buf: Buffer,
      opts?: { max?: number }
    ) => Promise<{ text: string }>;
    const { text } = await pdfParse(buffer, { max: 0 });
    if (text.trim().length < 500) return null;
    return text;
  } catch {
    return null;
  }
}

// Extract text from Textract LINE blocks, handling two-column layouts.
// Uses a gap-based column detection: if there's a horizontal gap > 20% of page width
// between clusters of lines, they're treated as separate columns (left then right).
function extractTextFromBlocks(blocks: Block[]): string {
  const lines = blocks
    .filter((b) => b.BlockType === "LINE" && b.Text && b.Geometry?.BoundingBox)
    .map((b) => ({
      text: b.Text!,
      top: b.Geometry!.BoundingBox!.Top!,
      left: b.Geometry!.BoundingBox!.Left!,
    }));

  if (lines.length === 0) return "";

  // Find the largest horizontal gap between line left-edges
  const sortedLefts = [...lines.map((l) => l.left)].sort((a, b) => a - b);
  let maxGap = 0;
  let splitAt = 0.5;
  for (let i = 1; i < sortedLefts.length; i++) {
    const gap = sortedLefts[i] - sortedLefts[i - 1];
    if (gap > maxGap) {
      maxGap = gap;
      splitAt = (sortedLefts[i] + sortedLefts[i - 1]) / 2;
    }
  }

  // Two-column layout detected when gap > 20% of page width
  if (maxGap > 0.2) {
    const left  = lines.filter((l) => l.left < splitAt).sort((a, b) => a.top - b.top);
    const right = lines.filter((l) => l.left >= splitAt).sort((a, b) => a.top - b.top);
    return [...left, ...right].map((l) => l.text).join("\n");
  }

  return lines.sort((a, b) => a.top - b.top || a.left - b.left).map((l) => l.text).join("\n");
}

// Run AWS Textract OCR on a scanned PDF.
// Splits into single-page PDFs (required for the synchronous Textract API),
// processes in parallel batches, and sends progress events via the SSE `send` callback.
async function ocrWithTextract(
  buffer: Buffer,
  send: (obj: object) => void,
  meta: { userId: string; userEmail?: string | null }
): Promise<string | null> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;

  const client = new TextractClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
  });

  // Split into single-page PDFs using pdf-lib
  let pageBuffers: Buffer[];
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const total = pdfDoc.getPageCount();
    pageBuffers = await Promise.all(
      Array.from({ length: total }, async (_, i) => {
        const single = await PDFDocument.create();
        const [page] = await single.copyPages(pdfDoc, [i]);
        single.addPage(page);
        return Buffer.from(await single.save());
      })
    );
  } catch (err) {
    console.error("[import-pdf] pdf-lib split failed:", err);
    return null;
  }

  const total = pageBuffers.length;
  console.log(JSON.stringify({ action: "import-pdf-ocr", provider: "aws-textract", pages: total, userId: meta.userId, userEmail: meta.userEmail, ts: new Date().toISOString() }));
  const pageTexts: string[] = new Array(total).fill("");
  let processed = 0;

  // Process in batches of TEXTRACT_BATCH pages at a time
  for (let i = 0; i < total; i += TEXTRACT_BATCH) {
    const batch = pageBuffers.slice(i, i + TEXTRACT_BATCH);
    await Promise.all(
      batch.map(async (pageBuf, j) => {
        try {
          const res = await client.send(
            new DetectDocumentTextCommand({ Document: { Bytes: pageBuf } })
          );
          pageTexts[i + j] = extractTextFromBlocks(res.Blocks ?? []);
        } catch (err) {
          console.error(`[import-pdf] Textract failed for page ${i + j}:`, err);
          pageTexts[i + j] = ""; // skip on error
        }
        processed++;
        send({ type: "ocr_progress", processed, total });
      })
    );
  }

  const combined = pageTexts.filter(Boolean).join("\n\n");
  return combined.trim().length > 0 ? combined : null;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error("[import-pdf] auth failed:", authError?.message ?? "no user");
    return new Response(
      JSON.stringify({ error: `Session expired — please refresh the page and try again (${authError?.message ?? "no session"})` }),
      { status: 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error("[import-pdf] formData parse failed:", e);
    return new Response(JSON.stringify({ error: "Could not read the uploaded file — please try again" }), { status: 400 });
  }

  const locale = (formData.get("locale") as string | null) ?? "en";
  const file = formData.get("pdf");
  if (!file || typeof file === "string")
    return new Response(JSON.stringify({ error: "No PDF attached — please select a file" }), { status: 400 });
  if ((file as File).type !== "application/pdf")
    return new Response(JSON.stringify({ error: "File must be a PDF (.pdf)" }), { status: 400 });
  if ((file as File).size > MAX_SIZE_BYTES)
    return new Response(JSON.stringify({ error: "File is too large — maximum size is 20 MB" }), { status: 400 });

  const fileName = (file as File).name;
  const bytes = await (file as File).arrayBuffer();
  const pdfBuffer = Buffer.from(bytes);
  const [pageCount, embeddedText] = await Promise.all([
    getPdfPageCount(pdfBuffer),
    extractEmbeddedText(pdfBuffer),
  ]);
  const hasTextract = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const initialMode: "text" | "ocr" | "vision" = embeddedText ? "text" : hasTextract ? "ocr" : "vision";
  console.log(`[import-pdf] initial mode=${initialMode} pages=${pageCount} embeddedChars=${embeddedText?.length ?? 0}`);

  // Create the play immediately so the client can navigate to it
  const tempTitle = fileName.replace(/\.pdf$/i, "") || "Imported play";
  const createResult = await createNewPlay(tempTitle);
  if (!createResult.id) {
    console.error("[import-pdf] createNewPlay failed:", createResult.error);
    return new Response(JSON.stringify({ error: `Could not create play — ${createResult.error ?? "database error"}` }), { status: 500 });
  }
  const playId = createResult.id;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(sseEvent(obj));

      // Tell the client about the new play immediately so it can navigate.
      // mode tells the client which import path was taken (for UX transparency).
      send({
        type: "created",
        playId,
        pageCount,
        extractedTextLength: embeddedText?.length ?? null,
        mode: initialMode,
      });

      let finalText = embeddedText;
      let mode = initialMode;

      // OCR phase: run Textract if needed (scanned PDF + AWS credentials available)
      if (!finalText && hasTextract) {
        const ocrText = await ocrWithTextract(pdfBuffer, send, { userId: user.id, userEmail: user.email });
        if (ocrText) {
          finalText = ocrText;
          mode = "ocr";
          // Tell the client the OCR length so progress tracking can switch to text-mode math
          send({ type: "ocr_done", extractedTextLength: ocrText.length });
        } else {
          mode = "vision";
          send({ type: "ocr_failed", mode: "vision" }); // client updates mode + falls back to page-based progress
        }
      }

      let ssf = "";
      let title = tempTitle;
      let author = "";
      let metaExtracted = false;

      try {
        // Build Claude message: text prompt for embedded/OCR text, vision prompt for scans
        const messages: Anthropic.MessageParam[] = finalText
          ? [{ role: "user", content: `${SSF_TEXT_PROMPT}\n\nExtracted PDF text:\n\n${finalText}` }]
          : [
              {
                role: "user",
                content: [
                  {
                    type: "document",
                    source: { type: "base64", media_type: "application/pdf", data: pdfBuffer.toString("base64") },
                  },
                  { type: "text", text: SSF_VISION_PROMPT },
                ],
              },
            ];

        console.log(`[import-pdf] calling Claude mode=${mode} textLen=${finalText?.length ?? 0}`);

        console.log(JSON.stringify({ action: "import-pdf", provider: "anthropic", model: "claude-sonnet-4-6", mode, userId: user.id, userEmail: user.email, ts: new Date().toISOString() }));
        const aiStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 64000,
          messages,
          metadata: { user_id: user.id },
        });

        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const text = event.delta.text;
            ssf += text;
            send({ type: "delta", text });

            if (!metaExtracted && ssf.split("\n").length >= 3) {
              const lines = ssf.split("\n").slice(0, 5);
              const titleLine  = lines.find((l) => l.startsWith("// title:"));
              const authorLine = lines.find((l) => l.startsWith("// author:"));
              if (titleLine) {
                title  = titleLine.replace("// title:", "").trim() || title;
                author = authorLine?.replace("// author:", "").trim() ?? "";
                send({ type: "meta", title, author });
                metaExtracted = true;
              }
            }
          }
        }

        send({ type: "saving" });

        const saveResult = await savePlayScript(playId, ssf, title, author || undefined, undefined, { ignoreParseErrors: true, locale });
        if (!saveResult.ok) {
          const reason = saveResult.dbError ?? "database error";
          console.error("[import-pdf] save failed:", reason, saveResult.errors?.length, "parse errors");
          send({ type: "error", message: `Script could not be saved — ${reason}` });
          return;
        }

        send({ type: "done", playId, title, scenesWritten: saveResult.scenesWritten ?? 0 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[import-pdf] error:", err);
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
