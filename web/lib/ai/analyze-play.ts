import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { extractCleanSpeechText, type ContentEntry } from "@/lib/script-types";

export interface CharacterProfile {
  gender: "male" | "female" | "neutral";
  age_range: "child" | "teen" | "young_adult" | "adult" | "elderly";
  description: string;
  has_dialogue?: boolean;
}

export interface ConfidenceOption {
  value: string;
  confidence: number; // 0–1
}

export interface PlayAnalysis {
  description: string;
  summary: string;
  play_type: string;
  play_type_options: ConfidenceOption[];
  script_type: string;
  script_type_options: ConfidenceOption[];
  detected_language: string;
  detected_language_options: ConfidenceOption[];
  characters: Record<string, CharacterProfile>;
}

export interface SceneCoachingAnalysis {
  summary: string;
  tensions: string;
  characters_present: string[];
  coaching_notes: Record<string, string>;
}

export interface CharacterCoachingAnalysis {
  arc: string;
  motivations: string;
  relationships: Record<string, string>;
  coaching_notes: string;
}

type SceneRow = {
  content: ContentEntry[];
  act?: string | null;
  title?: string | null;
  sort_order: number;
};

type PlayMeta = { title: string; author?: string | null };

// Max parallel Anthropic calls for coaching analysis
const COACHING_CONCURRENCY = 5;

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractSpeechLines(scenes: SceneRow[]): string {
  const lines: string[] = [];
  for (const scene of scenes) {
    for (const entry of scene.content) {
      if (entry.type === "line" && entry.ch) {
        const text = extractCleanSpeechText(entry);
        if (text) lines.push(`${entry.ch}: ${text}`);
      }
    }
  }
  return lines.join("\n");
}

const LOCALE_TO_LANGUAGE: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish",
  it: "Italian", pt: "Portuguese", ru: "Russian", nl: "Dutch",
  ja: "Japanese", zh: "Chinese", ar: "Arabic",
};

// ── Prompt builders ─────────────────────────────────────────────────────────

function buildMetadataPrompt(scriptExcerpt: string, uiLocale = "en"): string {
  const uiLanguage = LOCALE_TO_LANGUAGE[uiLocale] ?? "English";
  return `You are analyzing a script. Return ONLY a valid JSON object with this exact shape — no markdown, no explanation:

{
  "description": "<1-2 sentence short description suitable for a library card>",
  "summary": "<2-3 sentence plot summary covering the main arc>",
  "script_type_options": [
    { "value": "<type>", "confidence": <0.0-1.0> }
  ],
  "play_type_options": [
    { "value": "<type>", "confidence": <0.0-1.0> }
  ],
  "detected_language_options": [
    { "value": "<code>", "confidence": <0.0-1.0> }
  ],
  "characters": {
    "CHARACTER_NAME": {
      "gender": "male" | "female" | "neutral",
      "age_range": "child" | "teen" | "young_adult" | "adult" | "elderly",
      "description": "<one sentence: personality, role, key relationships>",
      "has_dialogue": true | false
    }
  }
}

Rules for script_type_options — the FORMAT or MEDIUM of the script:
- Values must be EXACTLY one of: theater_play, movie, short_film, tv_episode, sitcom, musical, opera, monologue, radio_drama
- Sort by confidence descending; confidences must sum to ≤ 1.0; omit values with confidence < 0.05

Rules for play_type_options — the GENRE or CATEGORY:
- Values must be EXACTLY one of: drama, comedy, tragedy, tragicomedy, romance, thriller, horror, crime, historical, fantasy, sci_fi, action, satire, farce, musical, other
- Sort by confidence descending; confidences must sum to ≤ 1.0; omit values with confidence < 0.05

Rules for detected_language_options — the PRIMARY LANGUAGE of the script:
- Values must be EXACTLY one of: en, fr, de, es, it, pt, ru, nl, ja, zh, ar, other
- Sort by confidence descending; if clearly one language give confidence 0.97+; sum to ≤ 1.0

Rules for text fields:
- Write description, summary, and ALL character descriptions in ${uiLanguage}, regardless of the script's language

Rules for characters:
- Include ALL characters: those with spoken lines AND those only mentioned in dialogue
- has_dialogue: true only if the character appears as a speaker cue in the script
- Use exact character names as they appear (uppercase)
- age_range must be exactly one of: child, teen, young_adult, adult, elderly

Script:
${scriptExcerpt.slice(0, 80000)}`;
}

function buildScenePrompt(
  scene: SceneRow,
  characters: Record<string, CharacterProfile>,
  summary: string,
  playMeta: PlayMeta,
  uiLocale = "en"
): string {
  const uiLanguage = LOCALE_TO_LANGUAGE[uiLocale] ?? "English";
  const label = [scene.act, scene.title].filter(Boolean).join(" — ") || `Scene ${scene.sort_order}`;
  const lines = scene.content
    .filter((e) => (e.type ?? "line") === "line" && e.ch)
    .map((e) => {
      const text = extractCleanSpeechText(e);
      return text ? `${e.ch}: ${text}` : null;
    })
    .filter((l): l is string => l !== null)
    .join("\n");
  const knownChars = Object.keys(characters).join(", ");

  return `You are preparing scene coaching data for an AI theatre coach. Return ONLY a JSON object — no markdown.

Play: "${playMeta.title}"${playMeta.author ? ` by ${playMeta.author}` : ""}
Summary: ${summary}
Known characters: ${knownChars}

Return this exact shape for this ONE scene:
{
  "summary": "<1-2 sentences: what happens>",
  "tensions": "<key dramatic stakes or conflicts>",
  "characters_present": ["CHARACTER_NAME"],
  "coaching_notes": {
    "CHARACTER_NAME": "<2-3 sentences of specific coaching advice for this character in this scene>"
  }
}

Rules:
- All text in ${uiLanguage}
- coaching_notes: only characters who have spoken lines in this scene
- characters_present: all characters with lines

Scene ${scene.sort_order}: ${label}
${lines || "(no dialogue)"}`;
}

function buildCharacterAnalysesPrompt(
  speechText: string,
  characters: Record<string, CharacterProfile>,
  summary: string,
  playMeta: PlayMeta,
  uiLocale = "en"
): string {
  const uiLanguage = LOCALE_TO_LANGUAGE[uiLocale] ?? "English";
  const speakingChars = Object.entries(characters)
    .filter(([, p]) => p.has_dialogue !== false)
    .map(([name, p]) => `${name} (${p.gender}, ${p.age_range}): ${p.description}`)
    .join("\n");

  return `You are preparing character coaching data for an AI theatre coach. Return ONLY a JSON object — no markdown.

Play: "${playMeta.title}"${playMeta.author ? ` by ${playMeta.author}` : ""}
Summary: ${summary}

Speaking characters:
${speakingChars}

Return this exact shape:
{
  "character_analyses": {
    "CHARACTER_NAME": {
      "arc": "<2-3 sentences: character journey and transformation across the whole play>",
      "motivations": "<1-2 sentences: core wants, needs, and driving forces>",
      "relationships": {
        "OTHER_CHARACTER_NAME": "<description of relationship and dynamic>"
      },
      "coaching_notes": "<2-3 sentences of practical acting advice — psychology, physicality, common pitfalls>"
    }
  }
}

Rules:
- All text in ${uiLanguage}
- Only include speaking characters (has_dialogue = true)
- Relationships: 2–4 key relationships per character maximum

Script:
${speechText.slice(0, 80000)}`;
}

// ── Concurrency helper ───────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map((t) => t()));
    results.push(...batchResults);
  }
  return results;
}

// ── Shared coaching orchestrator ─────────────────────────────────────────────

async function runCoachingCalls(
  client: Anthropic,
  scenes: SceneRow[],
  speechText: string,
  characters: Record<string, CharacterProfile>,
  summary: string,
  playMeta: PlayMeta,
  uiLocale: string,
  logMeta?: { userId?: string; userEmail?: string; playId?: string }
): Promise<{
  scene_analyses: Record<string, SceneCoachingAnalysis>;
  character_analyses: Record<string, CharacterCoachingAnalysis>;
}> {
  const sdkMeta = logMeta?.userId ? { metadata: { user_id: logMeta.userId } } : {};

  // One call per scene, run in parallel batches
  const sceneTasks = scenes.map((scene) => async () => {
    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: buildScenePrompt(scene, characters, summary, playMeta, uiLocale) }],
        ...sdkMeta,
      });
      const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      return { sort_order: scene.sort_order, analysis: JSON.parse(cleaned) as SceneCoachingAnalysis };
    } catch (err) {
      console.error(`[coaching] Scene ${scene.sort_order} failed:`, err);
      return null;
    }
  });

  // One call for all characters (flat speech text, moderate output)
  const charCallPromise = (async () => {
    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        messages: [{ role: "user", content: buildCharacterAnalysesPrompt(speechText, characters, summary, playMeta, uiLocale) }],
        ...sdkMeta,
      });
      const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      return (parsed.character_analyses ?? {}) as Record<string, CharacterCoachingAnalysis>;
    } catch (err) {
      console.error("[coaching] Character analyses failed:", err);
      return {} as Record<string, CharacterCoachingAnalysis>;
    }
  })();

  console.log(JSON.stringify({
    action: "coaching-analysis", provider: "anthropic", model: "claude-haiku-4-5-20251001",
    sceneCount: scenes.length, playId: logMeta?.playId,
    userId: logMeta?.userId, userEmail: logMeta?.userEmail, ts: new Date().toISOString(),
  }));

  // Run scene batches and character call concurrently
  const [sceneResults, characterAnalyses] = await Promise.all([
    runWithConcurrency(sceneTasks, COACHING_CONCURRENCY),
    charCallPromise,
  ]);

  const scene_analyses: Record<string, SceneCoachingAnalysis> = {};
  for (const result of sceneResults) {
    if (result) scene_analyses[String(result.sort_order)] = result.analysis;
  }

  return { scene_analyses, character_analyses: characterAnalyses };
}

// ── Progress helper ──────────────────────────────────────────────────────────

async function updateUserPlayProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userPlayId: string,
  update: { progress?: number; state?: string }
) {
  await supabase.from("user_plays").update(update).eq("id", userPlayId);
}

// ── Public exports ───────────────────────────────────────────────────────────

export async function rerunCoachingAnalysis(
  playId: string,
  uiLocale = "en",
  meta?: { userId?: string; userEmail?: string }
): Promise<{
  scene_analyses: Record<string, SceneCoachingAnalysis>;
  character_analyses: Record<string, CharacterCoachingAnalysis>;
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const supabase = await createClient();
  const [{ data: scenes }, { data: playMeta }, { data: analysisRow }] = await Promise.all([
    supabase.from("scenes").select("content, act, title, sort_order").eq("play_id", playId).order("sort_order"),
    supabase.from("plays").select("title, author").eq("id", playId).single(),
    supabase.from("play_ai_analysis").select("summary, character_profiles").eq("play_id", playId).maybeSingle(),
  ]);

  if (!scenes?.length || !playMeta || !analysisRow) return null;

  const typedScenes = scenes as SceneRow[];
  const speechText = extractSpeechLines(typedScenes);
  const characters = (analysisRow.character_profiles ?? {}) as Record<string, CharacterProfile>;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    return await runCoachingCalls(
      client, typedScenes, speechText, characters,
      analysisRow.summary ?? "", playMeta, uiLocale,
      { ...meta, playId }
    );
  } catch (err) {
    console.error("[rerunCoachingAnalysis] failed:", err);
    return null;
  }
}

export async function analyzePlay(
  playId: string,
  userPlayId: string,
  scriptText: string,
  uiLocale = "en",
  meta?: { userId?: string; userEmail?: string }
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[analyzePlay] ANTHROPIC_API_KEY not set — skipping");
    return;
  }

  const supabase = await createClient();

  const contentHash = await sha256(scriptText);
  const { data: existing } = await supabase
    .from("play_ai_analysis")
    .select("content_hash")
    .eq("play_id", playId)
    .maybeSingle();

  if (existing?.content_hash === contentHash) {
    await updateUserPlayProgress(supabase, userPlayId, { state: "ready", progress: 100 });
    return;
  }

  await updateUserPlayProgress(supabase, userPlayId, { progress: 20 });

  const [{ data: scenes }, { data: playMeta }] = await Promise.all([
    supabase.from("scenes").select("content, act, title, sort_order").eq("play_id", playId).order("sort_order"),
    supabase.from("plays").select("title, author").eq("id", playId).single(),
  ]);

  const typedScenes = (scenes ?? []) as SceneRow[];
  const speechText = typedScenes.length > 0 ? extractSpeechLines(typedScenes) : scriptText;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  await updateUserPlayProgress(supabase, userPlayId, { progress: 40 });

  // — Call 1: Metadata analysis —
  let raw: string;
  try {
    console.log(JSON.stringify({ action: "analyze-play-metadata", provider: "anthropic", model: "claude-haiku-4-5-20251001", playId, userId: meta?.userId, userEmail: meta?.userEmail, ts: new Date().toISOString() }));
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096, // 2048 was too small for plays with 30+ characters
      messages: [{ role: "user", content: buildMetadataPrompt(speechText, uiLocale) }],
      ...(meta?.userId ? { metadata: { user_id: meta.userId } } : {}),
    });
    raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  } catch (err) {
    console.error("[analyzePlay] Metadata call failed:", err);
    await updateUserPlayProgress(supabase, userPlayId, { state: "attention", progress: 0 });
    return;
  }

  let analysis: PlayAnalysis;
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    analysis = JSON.parse(cleaned);
  } catch (err) {
    console.error("[analyzePlay] Failed to parse metadata response:", raw, err);
    await updateUserPlayProgress(supabase, userPlayId, { state: "attention", progress: 0 });
    return;
  }

  const topType = analysis.play_type_options?.[0]?.value ?? "other";
  const topScriptType = analysis.script_type_options?.[0]?.value ?? "theater_play";
  const topLang = analysis.detected_language_options?.[0]?.value ?? "en";

  await updateUserPlayProgress(supabase, userPlayId, { progress: 65 });

  // — Calls 2…N+1: Coaching analysis (one call per scene + one for characters) —
  let sceneAnalyses: Record<string, SceneCoachingAnalysis> | null = null;
  let characterAnalyses: Record<string, CharacterCoachingAnalysis> | null = null;

  if (typedScenes.length > 0 && playMeta) {
    try {
      const result = await runCoachingCalls(
        client, typedScenes, speechText, analysis.characters,
        analysis.summary, playMeta, uiLocale,
        { ...meta, playId }
      );
      sceneAnalyses = result.scene_analyses;
      characterAnalyses = result.character_analyses;
    } catch (err) {
      // Non-fatal — metadata still saves
      console.error("[analyzePlay] Coaching analysis failed (non-fatal):", err);
    }
  }

  await updateUserPlayProgress(supabase, userPlayId, { progress: 85 });

  const { error } = await supabase.from("play_ai_analysis").upsert(
    {
      play_id: playId,
      content_hash: contentHash,
      description: analysis.description,
      summary: analysis.summary,
      play_type: topType,
      play_type_options: analysis.play_type_options ?? [],
      script_type: topScriptType,
      script_type_options: analysis.script_type_options ?? [],
      detected_language: topLang,
      detected_language_options: analysis.detected_language_options ?? [],
      character_profiles: analysis.characters,
      scene_analyses: sceneAnalyses,
      character_analyses: characterAnalyses,
      analysis_model: "claude-haiku-4-5-20251001",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "play_id" }
  );

  if (error) {
    console.error("[analyzePlay] DB upsert failed:", error);
    await updateUserPlayProgress(supabase, userPlayId, { state: "attention", progress: 0 });
    return;
  }

  await supabase.from("plays").update({ language: topLang }).eq("id", playId);
  await updateUserPlayProgress(supabase, userPlayId, { state: "ready", progress: 100 });
}
