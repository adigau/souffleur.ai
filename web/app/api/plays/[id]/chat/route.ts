import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ContentEntry } from "@/lib/script-types";
import type { SceneCoachingAnalysis, CharacterCoachingAnalysis } from "@/lib/ai/analyze-play";

function extractDialogue(scenes: { content: ContentEntry[]; act?: string; title?: string | null; sort_order?: number }[]): string {
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
        play_ai_analysis ( summary, description, play_type, character_profiles, scene_analyses, character_analyses ),
        scenes ( content, act, scene, sort_order, title )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!up) return new Response("Not found", { status: 404 });

  type CharProfile = { gender?: string; age_range?: string; description?: string; has_dialogue?: boolean };
  type SceneRow = { content: ContentEntry[]; act?: string; title?: string | null; sort_order: number };
  type AiRow = {
    summary?: string;
    description?: string;
    play_type?: string;
    character_profiles?: Record<string, CharProfile>;
    scene_analyses?: Record<string, SceneCoachingAnalysis> | null;
    character_analyses?: Record<string, CharacterCoachingAnalysis> | null;
  };
  type PlayRow = { title: string; author?: string | null; play_ai_analysis?: AiRow | AiRow[] | null; scenes?: SceneRow[] | null };

  const play = (up.plays as unknown) as PlayRow | null;
  if (!play) return new Response("Not found", { status: 404 });
  const roles: string[] = (up.role as string[]) ?? [];
  const aiRow: AiRow | undefined = Array.isArray(play?.play_ai_analysis) ? play.play_ai_analysis[0] : play?.play_ai_analysis ?? undefined;
  const charProfiles: Record<string, CharProfile> = aiRow?.character_profiles ?? {};
  const sceneAnalyses: Record<string, SceneCoachingAnalysis> | null = aiRow?.scene_analyses ?? null;
  const characterAnalyses: Record<string, CharacterCoachingAnalysis> | null = aiRow?.character_analyses ?? null;

  const sortedScenes = [...(play?.scenes ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  function lookupProfile(name: string) {
    return charProfiles[name]
      ?? Object.entries(charProfiles).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
  }

  function lookupCharAnalysis(name: string) {
    if (!characterAnalyses) return null;
    return characterAnalyses[name]
      ?? Object.entries(characterAnalyses).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1]
      ?? null;
  }

  // Build actor character sections using coaching analysis when available
  const actorRoleSections = roles.map((role) => {
    const p = lookupProfile(role);
    const ca = lookupCharAnalysis(role);

    if (ca) {
      // Use pre-generated coaching analysis
      const relationshipLines = Object.entries(ca.relationships ?? {})
        .map(([other, desc]) => `  ${other}: ${desc}`)
        .join("\n");

      return [
        `### ${role}`,
        p ? `Gender: ${p.gender} | Age: ${p.age_range}` : "",
        p?.description ? `Description: ${p.description}` : "",
        `Arc: ${ca.arc}`,
        `Motivations: ${ca.motivations}`,
        relationshipLines ? `Key Relationships:\n${relationshipLines}` : "",
        `Coaching Notes: ${ca.coaching_notes}`,
      ].filter(Boolean).join("\n");
    }

    // Fallback: show all the actor's lines across the play
    const roleLines: string[] = [];
    for (const scene of sortedScenes) {
      for (const entry of (scene.content as ContentEntry[]) ?? []) {
        if ((entry.type ?? "line") === "line" && entry.ch?.toLowerCase() === role.toLowerCase() && entry.text) {
          roleLines.push(`    ${entry.ch}: ${entry.text}`);
        }
      }
    }
    return [
      `### ${role}`,
      p ? `Gender: ${p.gender} | Age: ${p.age_range}` : "",
      p?.description ? `Description: ${p.description}` : "",
      `Total lines: ${roleLines.length}`,
      roleLines.length > 0 ? `All their lines in the play:\n${roleLines.join("\n")}` : "(no spoken lines)",
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const otherCharProfiles = Object.entries(charProfiles)
    .filter(([name, p]) =>
      p.has_dialogue !== false &&
      !roles.some((r) => r.toLowerCase() === name.toLowerCase())
    )
    .map(([name, p]) => `  ${name}: ${p.gender}, ${p.age_range} — ${p.description ?? ""}`)
    .join("\n");

  // Find the current scene and its coaching analysis
  let currentSceneLines: string[] = [];
  let actorAppearsInScene: boolean | null = null;
  let currentSceneOrder: number | null = null;

  if (currentSceneTitle) {
    const scene = sortedScenes.find(
      (s) =>
        s.title === currentSceneTitle ||
        [s.act, s.title].filter(Boolean).join(" — ") === currentSceneTitle
    );
    if (scene) {
      currentSceneOrder = scene.sort_order;
      let actorLineCount = 0;
      for (const entry of scene.content ?? []) {
        if ((entry.type ?? "line") === "line" && entry.ch && entry.text) {
          const isActor = roles.some((r) => r.toLowerCase() === entry.ch!.toLowerCase());
          if (isActor) actorLineCount++;
          currentSceneLines.push(`${isActor ? "▶ " : "  "}${entry.ch}: ${entry.text}`);
        }
      }
      actorAppearsInScene = actorLineCount > 0;
    }
  }

  const roleList = roles.length > 0 ? roles.join(", ") : null;

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

  // Build scene overview: all scenes with their coaching analysis
  // Current scene is marked and includes full dialogue; others show compact summaries only
  const allScenesBlock = sceneAnalyses
    ? sortedScenes
        .map((scene) => {
          const label =
            [scene.act, scene.title].filter(Boolean).join(" — ") ||
            `Scene ${scene.sort_order}`;
          const sa = sceneAnalyses[String(scene.sort_order)];
          const isCurrent = scene.sort_order === currentSceneOrder;

          if (isCurrent) {
            // Current scene: full dialogue + coaching context
            const coachingNotes = roles
              .map((role) => {
                const note =
                  sa?.coaching_notes?.[role] ??
                  Object.entries(sa?.coaching_notes ?? {}).find(
                    ([k]) => k.toLowerCase() === role.toLowerCase()
                  )?.[1];
                return note ? `  Coaching for ${role}: ${note}` : null;
              })
              .filter((l): l is string => l !== null);

            return [
              `▶ CURRENT SCENE: ${label}`,
              sa ? `  Summary: ${sa.summary}` : "",
              sa ? `  Stakes: ${sa.tensions}` : "",
              ...coachingNotes,
              roles.length > 0
                ? actorAppearsInScene
                  ? `  ${roleList} HAS lines in this scene (▶ below).`
                  : `  ${roleList} does NOT appear in this scene.`
                : "",
              currentSceneLines.length > 0
                ? `  (▶ = actor's lines)\n${currentSceneLines.map((l) => "  " + l).join("\n")}`
                : "  (no dialogue)",
            ].filter(Boolean).join("\n");
          }

          // Other scenes: compact summary only; use getSceneScript tool for full dialogue
          return sa
            ? `  SCENE [id:${scene.sort_order}]: ${label}\n  Summary: ${sa.summary}\n  Stakes: ${sa.tensions}`
            : `  SCENE [id:${scene.sort_order}]: ${label}`;
        })
        .join("\n\n")
    : // Fallback when no scene analyses: show current scene dialogue block only
      currentSceneTitle
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
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  // Full dialogue fallback: only when coaching analyses are not yet available AND no scene analyses block
  const hasCoachingData = characterAnalyses !== null && sceneAnalyses !== null;
  const playDialogue = hasCoachingData ? null : extractDialogue(sortedScenes);

  const replyLocale = uiLocale ?? language;
  let replyLangName: string | null = null;
  if (replyLocale) {
    try { replyLangName = new Intl.DisplayNames([replyLocale], { type: "language" }).of(replyLocale) ?? null; }
    catch { /* ignore */ }
  }

  const system = [
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
    `You are an expert theatre coach.`,
    replyLangName ? `Always respond in ${replyLangName}.` : "",
    `Speak directly to the actor in second person — warm, expert, concise.`,
    ``,
    actorRoleSections ? `THE ACTOR'S CHARACTER(S)\n${actorRoleSections}` : "",
    otherCharProfiles ? `OTHER SPEAKING CHARACTERS\n${otherCharProfiles}` : "",
    allScenesBlock ? `\nSCENES\n${allScenesBlock}` : "",
    aiRow?.summary ? `\nPLOT SUMMARY\n${aiRow.summary}` : "",
    playDialogue ? `\nFULL PLAY DIALOGUE\n${playDialogue}` : "",
    `\n---`,
    `Give practical, specific coaching advice. Reference exact lines when useful.`,
    `When relevant, connect character psychology to specific lines the actor has to deliver.`,
    sceneAnalyses
      ? `When you need the full dialogue of a scene other than the current one, call getSceneScript with the scene's id number shown in [id:N] tags.`
      : "",
  ].filter(Boolean).join("\n");

  console.log(JSON.stringify({ action: "play-chat", provider: "anthropic", model: "claude-haiku-4-5-20251001", playId: id, userId: user.id, userEmail: user.email, ts: new Date().toISOString() }));
  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: {
      role: "system" as const,
      content: system,
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 1024,
    stopWhen: stepCountIs(3),
    tools: {
      getSceneScript: {
        description:
          "Fetch the full dialogue for a specific scene when you need to reference exact lines. Only call this when the user's question requires quoting or analyzing specific lines from a scene other than the current one.",
        inputSchema: z.object({
          scene_id: z
            .number()
            .describe("The scene id number shown in [id:N] tags in the SCENES block"),
        }),
        execute: async ({ scene_id }) => {
          const scene = sortedScenes.find((s) => s.sort_order === scene_id);
          if (!scene) return { error: `Scene id ${scene_id} not found` };
          const label =
            [scene.act, scene.title].filter(Boolean).join(" — ") ||
            `Scene ${scene.sort_order}`;
          const sa = sceneAnalyses?.[String(scene.sort_order)];
          const lines = (scene.content as ContentEntry[])
            .filter((e) => (e.type ?? "line") === "line" && e.ch && e.text)
            .map((e) => {
              const isActor = roles.some(
                (r) => r.toLowerCase() === e.ch!.toLowerCase()
              );
              return `${isActor ? "▶ " : "  "}${e.ch}: ${e.text}`;
            })
            .join("\n");
          return {
            scene: label,
            summary: sa?.summary ?? null,
            tensions: sa?.tensions ?? null,
            dialogue: lines || "(no dialogue)",
          };
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
