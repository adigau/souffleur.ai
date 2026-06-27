import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { ContentEntry } from "@/lib/script-types";

export interface CharacterProfile {
  gender: "male" | "female" | "neutral";
  age_range: "child" | "teen" | "young_adult" | "adult" | "elderly";
  description: string;
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

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractSpeechLines(scenes: { content: ContentEntry[] }[]): string {
  const lines: string[] = [];
  for (const scene of scenes) {
    for (const entry of scene.content) {
      if (entry.type === "line" && entry.ch && entry.text) {
        lines.push(`${entry.ch}: ${entry.text}`);
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

function buildPrompt(scriptExcerpt: string, uiLocale = "en"): string {
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
  - theater_play: stage play with acts/scenes
  - movie: feature-length film screenplay
  - short_film: short-format film script
  - tv_episode: scripted TV drama episode
  - sitcom: comedic TV episode
  - musical: stage or screen musical with songs
  - opera: sung theatrical work
  - monologue: single-speaker dramatic piece
  - radio_drama: audio-only drama / podcast
- Sort by confidence descending; confidences must sum to ≤ 1.0; omit values with confidence < 0.05

Rules for play_type_options — the GENRE or CATEGORY:
- Values must be EXACTLY one of: drama, comedy, tragedy, tragicomedy, romance, thriller, horror, crime, historical, fantasy, sci_fi, action, satire, farce, musical, other
- Sort by confidence descending; confidences must sum to ≤ 1.0; omit values with confidence < 0.05

Rules for detected_language_options — the PRIMARY LANGUAGE of the script:
- Values must be EXACTLY one of: en, fr, de, es, it, pt, ru, nl, ja, zh, ar, other
- Sort by confidence descending; if the script is clearly one language, give it confidence 0.97+
- confidences must sum to ≤ 1.0

Rules for text fields:
- Write description, summary, and ALL character descriptions in ${uiLanguage} (the user's interface language), regardless of the script's language

Rules for characters:
- Include ALL characters: those with spoken lines AND those only mentioned in dialogue
- has_dialogue: true only if the character appears as a speaker cue in the script
- Use exact character names as they appear (uppercase)
- age_range must be exactly one of: child, teen, young_adult, adult, elderly

Script:
${scriptExcerpt.slice(0, 80000)}`;
}

async function updateUserPlayProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userPlayId: string,
  update: { progress?: number; state?: string }
) {
  await supabase
    .from("user_plays")
    .update({ ...update, ...(update.state ? {} : {}) })
    .eq("id", userPlayId);
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

  // If content hasn't changed, mark ready and exit
  if (existing?.content_hash === contentHash) {
    await updateUserPlayProgress(supabase, userPlayId, { state: "ready", progress: 100 });
    return;
  }

  // Fetch scenes — cheaper than sending raw SSF
  await updateUserPlayProgress(supabase, userPlayId, { progress: 20 });
  const { data: scenes } = await supabase
    .from("scenes")
    .select("content")
    .eq("play_id", playId)
    .order("sort_order");

  const speechText = scenes ? extractSpeechLines(scenes as any) : scriptText;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  await updateUserPlayProgress(supabase, userPlayId, { progress: 40 });

  let raw: string;
  try {
    console.log(JSON.stringify({ action: "analyze-play", provider: "anthropic", model: "claude-haiku-4-5-20251001", playId, userId: meta?.userId, userEmail: meta?.userEmail, ts: new Date().toISOString() }));
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(speechText, uiLocale) }],
      ...(meta?.userId ? { metadata: { user_id: meta.userId } } : {}),
    });
    raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  } catch (err) {
    console.error("[analyzePlay] Anthropic call failed:", err);
    await updateUserPlayProgress(supabase, userPlayId, { state: "attention", progress: 0 });
    return;
  }

  await updateUserPlayProgress(supabase, userPlayId, { progress: 85 });

  let analysis: PlayAnalysis;
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    analysis = JSON.parse(cleaned);
  } catch (err) {
    console.error("[analyzePlay] Failed to parse response:", raw, err);
    await updateUserPlayProgress(supabase, userPlayId, { state: "attention", progress: 0 });
    return;
  }

  // Derive top picks from options arrays
  const topType = analysis.play_type_options?.[0]?.value ?? "other";
  const topScriptType = analysis.script_type_options?.[0]?.value ?? "theater_play";
  const topLang = analysis.detected_language_options?.[0]?.value ?? "en";

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

  // Write detected language back to plays so audio generation uses the right voice pool
  await supabase.from("plays").update({ language: topLang }).eq("id", playId);

  await updateUserPlayProgress(supabase, userPlayId, { state: "ready", progress: 100 });
}
