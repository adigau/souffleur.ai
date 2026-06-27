"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getLocale } from "next-intl/server";
import { parseSSF, serializeSSF, type SsfError, type ParsedScene } from "@/lib/script-format";
import { analyzePlay } from "@/lib/ai/analyze-play";
import { syncAudioLines } from "@/lib/ai/sync-audio-lines";

// Creates a new blank play and returns the user_play id
export async function createNewPlay(title = "Untitled play"): Promise<{ id: string | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, error: "Not authenticated" };

  const { data: play, error: playErr } = await supabase
    .from("plays")
    .insert({ title, is_sample: false })
    .select("id")
    .single();

  if (playErr || !play) {
    console.error("[createNewPlay] plays insert failed:", playErr);
    return { id: null, error: playErr?.message ?? "Failed to create play" };
  }

  const { data: up, error: upErr } = await supabase
    .from("user_plays")
    .insert({ play_id: play.id, user_id: user.id, state: "ready" })
    .select("id")
    .single();

  if (upErr || !up) {
    console.error("[createNewPlay] user_plays insert failed:", upErr);
    return { id: null, error: upErr?.message ?? "Failed to add play to library" };
  }

  revalidatePath("/app");
  return { id: up.id };
}

// Clones a sample play into the user's own editable library copy
export async function addSampleToLibrary(playTitle: string): Promise<{ id: string | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, error: "Not authenticated" };

  // Fetch the sample play with its metadata
  const { data: sample, error: sampleErr } = await supabase
    .from("plays")
    .select("id, title, author, script_text")
    .eq("title", playTitle)
    .eq("is_sample", true)
    .single();

  if (!sample) {
    console.error("[addSampleToLibrary] sample not found:", sampleErr);
    return { id: null, error: "Sample play not found" };
  }

  // Fetch the sample's scenes
  const { data: sampleScenes } = await supabase
    .from("scenes")
    .select("act, scene, sort_order, title, content")
    .eq("play_id", sample.id)
    .order("sort_order");

  // Create a new owned play (is_sample: false) — user gets full edit access
  const { data: play, error: playErr } = await supabase
    .from("plays")
    .insert({ title: sample.title, author: sample.author, is_sample: false, script_text: sample.script_text })
    .select("id")
    .single();

  if (playErr || !play) {
    console.error("[addSampleToLibrary] play insert failed:", playErr);
    return { id: null, error: playErr?.message ?? "Failed to create play" };
  }

  // Create user_plays record in processing state
  const { data: up, error: upErr } = await supabase
    .from("user_plays")
    .insert({ play_id: play.id, user_id: user.id, state: "processing", progress: 5 })
    .select("id")
    .single();

  if (upErr || !up) {
    console.error("[addSampleToLibrary] user_plays insert failed:", upErr);
    return { id: null, error: upErr?.message ?? "Failed to add to library" };
  }

  // Copy scenes from sample to the new play
  if (sampleScenes?.length) {
    await supabase.from("scenes").insert(
      sampleScenes.map((s) => ({ ...s, play_id: play.id }))
    );
  }

  // Derive script text from scenes when script_text is absent (seeded plays have no raw SSF)
  const scriptText = sample.script_text ?? (sampleScenes?.length ? serializeSSF(sampleScenes as any) : "");

  // Persist the derived script_text so the editor and future re-analyses have it
  if (!sample.script_text && scriptText) {
    await supabase.from("plays").update({ script_text: scriptText }).eq("id", play.id);
  }

  revalidatePath("/", "layout");

  // Trigger AI analysis and audio sync in the background
  const locale = await getLocale();
  after(() => analyzePlay(play.id, up.id, scriptText, locale, { userId: user.id, userEmail: user.email }));
  after(() => syncAudioLines(play.id));

  return { id: up.id };
}

export async function upsertLineNote(
  userPlayId: string,
  sceneId: string,
  lineIndex: number,
  text: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (text.trim()) {
    await supabase.from("user_line_notes").upsert(
      { user_play_id: userPlayId, scene_id: sceneId, line_index: lineIndex, text: text.trim(), updated_at: new Date().toISOString() },
      { onConflict: "user_play_id,scene_id,line_index" }
    );
  } else {
    await supabase
      .from("user_line_notes")
      .delete()
      .eq("user_play_id", userPlayId)
      .eq("scene_id", sceneId)
      .eq("line_index", lineIndex);
  }
}

export async function getNotesForPlay(userPlayId: string): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_line_notes")
    .select("scene_id, line_index, text")
    .eq("user_play_id", userPlayId);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[`${row.scene_id}-${row.line_index}`] = row.text;
  }
  return map;
}

export async function savePlayScript(
  userPlayId: string,
  rawText: string,
  title?: string,
  author?: string,
  language?: string,
  options?: { ignoreParseErrors?: boolean; locale?: string }
): Promise<{ ok: boolean; errors: SsfError[]; dbError?: string; scenesWritten?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errors: [] };

  // Resolve play_id and verify edit permission (non-sample plays are editable)
  const { data: upRow } = await supabase
    .from("user_plays")
    .select("play_id, plays(is_sample)")
    .eq("id", userPlayId)
    .eq("user_id", user.id)
    .single();

  if (!upRow) return { ok: false, errors: [], dbError: "Play not found" };

  const playId: string = upRow.play_id;
  const canEdit: boolean = (upRow.plays as any)?.is_sample === false;

  if (!canEdit) return { ok: false, errors: [], dbError: "This play cannot be edited" };

  const { scenes, errors } = parseSSF(rawText);
  const hardErrors = errors.filter((e) => e.severity === "error");
  if (hardErrors.length > 0 && !options?.ignoreParseErrors) return { ok: false, errors };

  // Update title, author, language, and raw script text
  const titleUpdate: Record<string, string> = { script_text: rawText };
  if (title?.trim()) titleUpdate.title = title.trim();
  if (author !== undefined) titleUpdate.author = author.trim();
  if (language) titleUpdate.language = language;
  const { error: titleErr } = await supabase
    .from("plays")
    .update(titleUpdate)
    .eq("id", playId);
  if (titleErr) {
    console.error("[savePlayScript] play update failed:", titleErr);
    return { ok: false, errors: [], dbError: `Play update: ${titleErr.message}` };
  }

  // Replace all scenes atomically
  const { error: delErr } = await supabase
    .from("scenes")
    .delete()
    .eq("play_id", playId);
  if (delErr) {
    console.error("[savePlayScript] scenes delete failed:", delErr);
    return { ok: false, errors: [], dbError: `Scene delete: ${delErr.message}` };
  }

  if (scenes.length > 0) {
    const { error: insErr } = await supabase.from("scenes").insert(
      scenes.map((s: ParsedScene) => ({
        play_id: playId,
        act: s.act,
        scene: s.scene,
        sort_order: s.sort_order,
        title: s.title,
        content: s.content,
      }))
    );
    if (insErr) {
      console.error("[savePlayScript] scenes insert failed:", insErr);
      return { ok: false, errors: [], dbError: `Scene insert: ${insErr.message}` };
    }
  }

  // Mark as processing immediately so the library shows progress right away
  await supabase
    .from("user_plays")
    .update({ state: "processing", progress: 5 })
    .eq("id", userPlayId);

  // Revalidate for all locales
  revalidatePath("/", "layout");

  const uiLocale = options?.locale ?? await getLocale();

  // Background: analyze play with AI + sync audio line rows (non-blocking)
  after(() => analyzePlay(playId, userPlayId, rawText, uiLocale, { userId: user.id, userEmail: user.email }));
  after(() => syncAudioLines(playId));

  return { ok: true, errors, scenesWritten: scenes.length };
}

export async function deletePlay(userPlayId: string, redirectPath?: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Resolve play_id and verify it's a non-sample play the user owns
  const { data: upRow } = await supabase
    .from("user_plays")
    .select("play_id, plays(is_sample)")
    .eq("id", userPlayId)
    .eq("user_id", user.id)
    .single();

  if (!upRow) return { ok: false, error: "Play not found" };

  const playId: string = upRow.play_id;
  const canDelete: boolean = (upRow.plays as any)?.is_sample === false;
  if (!canDelete) return { ok: false, error: "Sample plays cannot be deleted" };

  // Delete the play — cascades to scenes and user_plays
  const { error: delErr } = await supabase
    .from("plays")
    .delete()
    .eq("id", playId);

  if (delErr) {
    console.error("[deletePlay] failed:", delErr);
    return { ok: false, error: delErr.message };
  }

  revalidatePath("/", "layout");
  if (redirectPath) redirect(redirectPath);
  return { ok: true };
}

export async function toggleUserPlayRole(userPlayId: string, character: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("user_plays")
    .select("role")
    .eq("id", userPlayId)
    .eq("user_id", user.id)
    .single();

  const current: string[] = data?.role ?? [];
  const next = current.includes(character)
    ? current.filter((r) => r !== character)
    : [...current, character];

  await supabase
    .from("user_plays")
    .update({ role: next.length > 0 ? next : null })
    .eq("id", userPlayId)
    .eq("user_id", user.id);

  revalidatePath(`/app/plays/${userPlayId}`);
}
