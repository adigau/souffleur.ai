import { createClient } from "@/lib/supabase/server";
import type { Play } from "@/components/library/LibCard";
import { serializeSSF } from "@/lib/script-format";

export async function getUserPlays(): Promise<Play[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_plays")
    .select(`
      id,
      role,
      off_book_pct,
      last_practiced,
      state,
      note,
      progress,
      plays (
        id,
        title,
        author,
        is_monologue,
        play_ai_analysis ( description, play_type )
      )
    `)
    .eq("user_id", user.id)
    .order("last_practiced", { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  return data.map((row: any) => {
    const analysisRows = row.plays?.play_ai_analysis;
    const analysis = Array.isArray(analysisRows) ? analysisRows[0] : analysisRows;
    return {
      id: row.id,
      title: row.plays.title,
      author: row.plays.author,
      role: (row.role as string[] | null) ?? undefined,
      off_book_pct: row.off_book_pct ?? 0,
      last_practiced: row.last_practiced,
      state: row.state ?? "ready",
      note: row.note,
      progress: row.progress,
      is_monologue: row.plays.is_monologue,
      description: analysis?.description ?? undefined,
      play_type: analysis?.play_type ?? undefined,
    };
  });
}

export async function getPlayScript(userPlayId: string): Promise<{
  playId: string;
  title: string;
  language: string | null;
  scriptText: string;
  canEdit: boolean;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_plays")
    .select(`
      id,
      plays (
        id,
        title,
        is_sample,
        script_text,
        language,
        scenes (
          id,
          act,
          scene,
          sort_order,
          title,
          content
        )
      )
    `)
    .eq("id", userPlayId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  const play = data.plays as any;
  // Any non-sample play in the user's library is editable by that user
  const canEdit: boolean = play.is_sample === false;

  // Prefer the stored raw text (exact round-trip); fall back to serializing from
  // scenes for plays that predate the script_text column (migration 008).
  let scriptText: string = play.script_text ?? "";
  if (!scriptText && play.scenes?.length > 0) {
    const sorted = [...play.scenes].sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );
    scriptText = serializeSSF(sorted);
  }

  return {
    playId: play.id,
    title: play.title,
    language: (play.language as string | null) ?? null,
    scriptText,
    canEdit,
  };
}

export async function getPlayById(userPlayId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_plays")
    .select(`
      id,
      role,
      off_book_pct,
      last_practiced,
      state,
      plays (
        id,
        title,
        author,
        is_sample,
        language,
        play_ai_analysis (
          play_type, play_type_options,
          detected_language, detected_language_options,
          description, summary, character_profiles, updated_at
        ),
        scenes (
          id,
          act,
          scene,
          sort_order,
          title,
          content
        )
      )
    `)
    .eq("id", userPlayId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return data;
}
