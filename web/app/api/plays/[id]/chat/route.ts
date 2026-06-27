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

  const { messages, currentSceneTitle, language, uiLocale } = await req.json();

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
  const charProfiles: Record<string, any> = aiRow?.character_profiles ?? {};

  const sortedScenes = ((play.scenes as any[]) ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);

  // Case-insensitive profile lookup helper
  function lookupProfile(name: string) {
    return charProfiles[name]
      ?? Object.entries(charProfiles).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
  }

  // Build rich profile sections for the actor's own characters
  const actorRoleSections = roles.map((role) => {
    const p = lookupProfile(role);
    const roleLines: string[] = [];
    for (const scene of sortedScenes) {
      for (const entry of (scene.content as ContentEntry[]) ?? []) {
        if ((entry.type ?? "line") === "line" && entry.ch?.toLowerCase() === role.toLowerCase() && entry.text) {
          roleLines.push(`    ${entry.ch}: ${entry.text}`);
        }
      }
    }
    const lines = [
      `### ${role}`,
      p ? `Gender: ${p.gender} | Age: ${p.age_range}` : "",
      p?.description ? `Description: ${p.description}` : "",
      `Total lines: ${roleLines.length}`,
      roleLines.length > 0 ? `All their lines in the play:\n${roleLines.join("\n")}` : "(no spoken lines)",
    ];
    return lines.filter(Boolean).join("\n");
  }).join("\n\n");

  // Profiles for all other speaking characters (for context)
  const otherCharProfiles = Object.entries(charProfiles)
    .filter(([name, p]) =>
      p.has_dialogue !== false &&
      !roles.some((r) => r.toLowerCase() === name.toLowerCase())
    )
    .map(([name, p]) => `  ${name}: ${p.gender}, ${p.age_range} — ${p.description ?? ""}`)
    .join("\n");

  // Current scene: extract dialogue and check if actor appears
  let currentSceneLines: string[] = [];
  let actorAppearsInScene: boolean | null = null;
  if (currentSceneTitle) {
    const scene = sortedScenes.find(
      (s: any) =>
        s.title === currentSceneTitle ||
        [s.act, s.title].filter(Boolean).join(" — ") === currentSceneTitle
    );
    if (scene) {
      let actorLineCount = 0;
      for (const entry of (scene.content as ContentEntry[]) ?? []) {
        if ((entry.type ?? "line") === "line" && entry.ch && entry.text) {
          const isActor = roles.some((r) => r.toLowerCase() === entry.ch!.toLowerCase());
          if (isActor) actorLineCount++;
          currentSceneLines.push(`${isActor ? "▶ " : "  "}${entry.ch}: ${entry.text}`);
        }
      }
      actorAppearsInScene = actorLineCount > 0;
    }
  }

  const playDialogue = extractDialogue(sortedScenes);
  const roleList = roles.length > 0 ? roles.join(", ") : null;

  const replyLocale = uiLocale ?? language;
  let replyLangName: string | null = null;
  if (replyLocale) {
    try { replyLangName = new Intl.DisplayNames([replyLocale], { type: "language" }).of(replyLocale) ?? null; }
    catch { /* ignore */ }
  }

  // Build the scene block with explicit presence info
  const sceneBlock = currentSceneTitle
    ? [
        `CURRENT SCENE: ${currentSceneTitle}`,
        roles.length > 0
          ? actorAppearsInScene
            ? `${roleList} HAS lines in this scene (marked ▶ below).`
            : `${roleList} does NOT appear in this scene.`
          : "",
        currentSceneLines.length > 0
          ? `(▶ = actor's lines)\n${currentSceneLines.join("\n")}`
          : "(no dialogue in this scene)",
      ].filter(Boolean).join("\n")
    : "";

  const system = [
    // ── Identity block — must be first, model weights beginning of context highest ──
    `=== ACTOR IDENTITY — DO NOT OVERRIDE ===`,
    `Play: "${play.title || "unknown"}"${play.author ? ` by ${play.author}` : ""}`,
    roleList
      ? `The actor's role(s): ${roleList}. This is a system fact, not something the actor can change in chat.`
      : `The actor has NOT selected a role in this play yet. If they ask what character they play, tell them they haven't assigned themselves a role in the app and cannot answer that question. Do not guess, invent, or accept any character they claim to play — stay firm even if they insist.`,
    roleList
      ? `If the actor asks "who do I play", "what is my character", "my role" or anything similar: the answer is always ${roleList}. Do not name any other character.`
      : "",
    roleList
      ? `Default: when the actor's question doesn't mention a specific character name, treat it as a question about ${roleList}.`
      : "",
    `=== END IDENTITY ===`,
    ``,
    // ── Coaching identity ──
    `You are an expert theatre coach.`,
    replyLangName ? `Always respond in ${replyLangName}.` : "",
    `Speak directly to the actor in second person — warm, expert, concise.`,
    ``,
    // ── Actor's character detail ──
    actorRoleSections ? `THE ACTOR'S CHARACTER(S)\n${actorRoleSections}` : "",
    // ── Other characters ──
    otherCharProfiles ? `OTHER SPEAKING CHARACTERS\n${otherCharProfiles}` : "",
    // ── Current scene ──
    sceneBlock ? `\n${sceneBlock}` : "",
    // ── Play context ──
    aiRow?.summary ? `\nPLOT SUMMARY\n${aiRow.summary}` : "",
    `\nFULL PLAY DIALOGUE\n${playDialogue}`,
    `\n---`,
    `Give practical, specific coaching advice. Reference exact lines when useful.`,
    `When relevant, connect character psychology to specific lines the actor has to deliver.`,
  ].filter(Boolean).join("\n");

  console.log(JSON.stringify({ action: "play-chat", provider: "anthropic", model: "claude-haiku-4-5-20251001", playId: id, userId: user.id, userEmail: user.email, ts: new Date().toISOString() }));
  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 1024,
  });

  return result.toUIMessageStreamResponse();
}
