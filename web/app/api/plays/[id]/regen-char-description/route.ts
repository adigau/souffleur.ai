import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import type { ContentEntry } from "@/lib/script-types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "AI not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { characterName, gender, age_range, uiLocale } = await req.json();
  if (!characterName) return Response.json({ error: "characterName required" }, { status: 400 });

  let replyLangName: string | null = null;
  if (uiLocale) {
    try { replyLangName = new Intl.DisplayNames([uiLocale], { type: "language" }).of(uiLocale) ?? null; }
    catch { /* ignore */ }
  }

  const { data: up } = await supabase
    .from("user_plays")
    .select(`
      plays (
        title, author,
        play_ai_analysis ( summary ),
        scenes ( content, sort_order )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!up) return Response.json({ error: "Not found" }, { status: 404 });

  const play = up.plays as any;
  const aiRow = Array.isArray(play.play_ai_analysis)
    ? play.play_ai_analysis[0]
    : play.play_ai_analysis;

  // Extract a sample of this character's spoken lines for context
  const sortedScenes = ((play.scenes as any[]) ?? []).sort(
    (a: any, b: any) => a.sort_order - b.sort_order
  );
  const charLines: string[] = [];
  for (const scene of sortedScenes) {
    for (const entry of (scene.content as ContentEntry[]) ?? []) {
      if (
        (entry.type == null || entry.type === "line") &&
        entry.ch?.toLowerCase() === characterName.toLowerCase() &&
        entry.text
      ) {
        charLines.push(entry.text);
      }
    }
  }

  const sampleLines = charLines.slice(0, 20).join("\n");

  const prompt = [
    `Play: "${play.title || "unknown"}"${play.author ? ` by ${play.author}` : ""}.`,
    aiRow?.summary ? `Summary: ${aiRow.summary}` : "",
    `Character: ${characterName} — ${gender}, ${age_range}.`,
    sampleLines
      ? `Sample lines:\n${sampleLines}`
      : "(no spoken lines — mentioned character only)",
    ``,
    replyLangName ? `Write your response in ${replyLangName}.` : "",
    `Write exactly ONE sentence (under 25 words) describing ${characterName}'s personality, dramatic role, and key relationships. Be specific. No preamble.`,
  ]
    .filter(Boolean)
    .join("\n");

  console.log(JSON.stringify({ action: "regen-char-description", provider: "anthropic", model: "claude-haiku-4-5-20251001", playId: id, userId: user.id, userEmail: user.email, ts: new Date().toISOString() }));
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt,
    maxOutputTokens: 80,
  });

  return Response.json({ description: text.trim() });
}
