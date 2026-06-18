import { streamText, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import type { ContentEntry } from "@/lib/script-types";

function extractDialogue(scenes: { content: ContentEntry[]; act?: string; title?: string; sort_order?: number }[]): string {
  const blocks: string[] = [];
  for (const scene of scenes) {
    const label = [scene.act, scene.title].filter(Boolean).join(" — ");
    if (label) blocks.push(`\n[${label}]`);
    for (const entry of scene.content) {
      if ((entry.type ?? "line") === "line" && entry.ch && entry.text) {
        blocks.push(`${entry.ch}: ${entry.text}`);
      }
    }
  }
  return blocks.join("\n").trim();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("AI not configured", { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { messages, currentSceneTitle, language } = await req.json();

  const { data: up } = await supabase
    .from("user_plays")
    .select(`
      role,
      plays (
        title, author,
        play_ai_analysis ( summary, description, play_type, character_profiles ),
        scenes ( content, act, scene, sort_order, title )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!up) return new Response("Not found", { status: 404 });

  const play = up.plays as any;
  const roles: string[] = (up.role as string[]) ?? [];
  const aiRow = Array.isArray(play.play_ai_analysis) ? play.play_ai_analysis[0] : play.play_ai_analysis;

  const sortedScenes = ((play.scenes as any[]) ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const playDialogue = extractDialogue(sortedScenes);

  const roleList = roles.length > 0 ? roles.join(", ") : null;

  const characterLines = aiRow?.character_profiles
    ? Object.entries(aiRow.character_profiles as Record<string, any>)
        .filter(([, p]) => p.has_dialogue !== false)
        .map(([name, p]) => `  ${name}: ${p.gender}, ${p.age_range} — ${p.description}`)
        .join("\n")
    : "";

  let langName: string | null = null;
  if (language) {
    try { langName = new Intl.DisplayNames([language], { type: "language" }).of(language) ?? null; }
    catch { /* ignore */ }
  }

  const system = [
    `You are an expert theatre coach helping an actor prepare for their performance.`,
    langName ? `Always respond in ${langName}.` : "",
    roleList
      ? `The actor is playing ${roleList} in "${play.title || "this play"}"${play.author ? ` by ${play.author}` : ""}.`
      : `The actor is studying "${play.title || "this play"}"${play.author ? ` by ${play.author}` : ""}.`,
    currentSceneTitle ? `They are currently working on: ${currentSceneTitle}.` : "",
    aiRow?.summary ? `\nPlot: ${aiRow.summary}` : "",
    characterLines ? `\nCharacter profiles:\n${characterLines}` : "",
    `\nFull play dialogue:\n${playDialogue}`,
    `\n---`,
    `Give practical, specific coaching advice. Reference exact lines and scenes when useful.`,
    `Speak directly to the actor — warm, expert, concise.`,
  ].filter(Boolean).join("\n");

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 1024,
  });

  return result.toUIMessageStreamResponse();
}
