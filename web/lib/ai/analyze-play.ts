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

function buildPrompt(scriptExcerpt: string): string {
  return `You are analyzing a theatrical play script. Return ONLY a valid JSON object with this exact shape — no markdown, no explanation:

{
  "description": "<1-2 sentence short description suitable for a library card>",
  "summary": "<2-3 sentence plot summary covering the main arc>",
  "play_type_options": [
    { "value": "<type>", "confidence": <0.0-1.0> }
  ],
  "detected_language_options": [
    { "value": "<ISO 639-1 code>", "confidence": <0.0-1.0> }
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

Rules for play_type_options:
- Include all plausible genres, sorted by confidence descending
- Values must be from: tragedy, comedy, tragicomedy, drama, farce, musical, melodrama, historical, thriller, other
- Confidences must sum to ≤ 1.0; include only types with confidence > 0.05

Rules for detected_language_options:
- Include all languages present, sorted by confidence descending
- Use ISO 639-1 codes (en, fr, de, es, it, pt, ru, nl, pl, sv, ja, zh, ar, etc.)
- If the script is clearly one language, give it confidence 0.97+

Rules for characters:
- Include ALL characters: both those with spoken lines AND those only mentioned in dialogue
- Set has_dialogue: true for characters who speak; false for characters only referenced/mentioned
- Use exact character names as they appear (uppercase)
- age_range must be one of the five exact values

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
  scriptText: string
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
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(speechText) }],
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
  const topLang = analysis.detected_language_options?.[0]?.value ?? "en";

  const { error } = await supabase.from("play_ai_analysis").upsert(
    {
      play_id: playId,
      content_hash: contentHash,
      description: analysis.description,
      summary: analysis.summary,
      play_type: topType,
      play_type_options: analysis.play_type_options ?? [],
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

  await updateUserPlayProgress(supabase, userPlayId, { state: "ready", progress: 100 });
}
