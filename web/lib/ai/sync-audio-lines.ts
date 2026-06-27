import { createAdminClient } from "@/lib/supabase/admin";
import { extractCleanSpeechText } from "@/lib/script-types";
import type { ContentEntry } from "@/lib/script-types";

async function contentHash(charName: string, speechText: string): Promise<string> {
  const data = new TextEncoder().encode(charName + "|" + speechText);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function syncAudioLines(playId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: scenes } = await admin
    .from("scenes")
    .select("sort_order, content")
    .eq("play_id", playId)
    .order("sort_order");

  if (!scenes || scenes.length === 0) return;

  const newRows: {
    play_id: string;
    scene_sort_order: number;
    line_index: number;
    character_name: string;
    speech_text: string;
    content_hash: string;
  }[] = [];

  for (const scene of scenes) {
    const entries: ContentEntry[] = scene.content as ContentEntry[];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.type !== "line" || !entry.ch) continue;
      const speechText = extractCleanSpeechText(entry);
      if (!speechText.trim()) continue;
      const hash = await contentHash(entry.ch, speechText);
      newRows.push({
        play_id: playId,
        scene_sort_order: scene.sort_order,
        line_index: i,
        character_name: entry.ch,
        speech_text: speechText,
        content_hash: hash,
      });
    }
  }

  // Fetch existing rows for this play
  const { data: existing } = await admin
    .from("scene_audio_lines")
    .select("id, scene_sort_order, line_index, content_hash, generation_state")
    .eq("play_id", playId);

  const existingMap = new Map(
    (existing ?? []).map((r) => [`${r.scene_sort_order}:${r.line_index}`, r])
  );
  const newKeySet = new Set(newRows.map((r) => `${r.scene_sort_order}:${r.line_index}`));

  // Upsert rows that are new, have changed content, or previously errored (retry)
  const toUpsert = newRows.filter((r) => {
    const ex = existingMap.get(`${r.scene_sort_order}:${r.line_index}`);
    return !ex || ex.content_hash !== r.content_hash || ex.generation_state === "error";
  });

  // Delete rows for positions that no longer exist
  const toDeleteIds = (existing ?? [])
    .filter((r) => !newKeySet.has(`${r.scene_sort_order}:${r.line_index}`))
    .map((r) => r.id);

  const now = new Date().toISOString();

  if (toUpsert.length > 0) {
    await admin.from("scene_audio_lines").upsert(
      toUpsert.map((r) => ({
        ...r,
        generation_state: "pending",
        storage_path: null,
        word_timestamps: null,
        duration_ms: null,
        tts_voice_id: null,
        error_message: null,
        updated_at: now,
      })),
      { onConflict: "play_id,scene_sort_order,line_index" }
    );
  }

  if (toDeleteIds.length > 0) {
    await admin.from("scene_audio_lines").delete().in("id", toDeleteIds);
  }
}
