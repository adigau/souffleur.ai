import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createNewPlay, savePlayScript } from "@/lib/actions/plays";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

const SSF_PROMPT = `You are converting a theatrical play PDF into Souffleur Script Format (SSF).

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
2. The FIRST LINE must be exactly: // title: <play title as printed on the cover or title page>
3. Character names: UPPERCASE, preceded by @. Preserve the exact spelling from the PDF.
4. Strip all of: page numbers, running headers/footers, margin line numbers, editor footnotes, ISBN/copyright blocks, printer marks.
5. Use // [illegible] where text is unreadable.
6. Use // [content missing or unclear] if pages appear to be absent.
7. Multi-character simultaneous speech: @LABEL:CHAR1+CHAR2
8. Do NOT invent dialogue. Transcribe only what is printed in the PDF.
9. Output the complete play from beginning to end.

Convert the attached PDF now.`;

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("pdf");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be under 20 MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 32000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: SSF_PROMPT,
            },
          ],
        },
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[import-pdf] Claude error:", err);
    return NextResponse.json({ error: "AI conversion failed: " + msg }, { status: 502 });
  }

  const truncated = message.stop_reason === "max_tokens";
  const firstBlock = message.content[0];
  const rawSsf = firstBlock?.type === "text" ? firstBlock.text : "";

  if (!rawSsf) {
    return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });
  }

  // Extract title from first `// title:` line, fall back to filename
  const firstLine = rawSsf.split("\n")[0] ?? "";
  let title = file.name.replace(/\.pdf$/i, "") || "Imported play";
  if (firstLine.startsWith("// title:")) {
    const extracted = firstLine.replace("// title:", "").trim();
    if (extracted) title = extracted;
  }

  const createResult = await createNewPlay(title);
  if (!createResult.id) {
    return NextResponse.json(
      { error: createResult.error ?? "Failed to create play" },
      { status: 500 }
    );
  }

  const saveResult = await savePlayScript(createResult.id, rawSsf, title);
  if (!saveResult.ok) {
    return NextResponse.json(
      { error: "Script could not be saved", errors: saveResult.errors },
      { status: 422 }
    );
  }

  return NextResponse.json({
    userPlayId: createResult.id,
    title,
    scenesWritten: saveResult.scenesWritten ?? 0,
    warnings: saveResult.errors,
    truncated,
  });
}
