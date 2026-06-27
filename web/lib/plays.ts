import { createClient } from "@/lib/supabase/server";
import type { Play } from "@/lib/script-types";
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
        play_ai_analysis ( description, play_type, script_type, detected_language )
      )
    `)
    .eq("user_id", user.id)
    .order("last_practiced", { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  type AnalysisRow = {
    description?: string | null;
    play_type?: string | null;
    script_type?: string | null;
    detected_language?: string | null;
  };

  return data.map((row) => {
    // Supabase infers nested relations with broad types — cast through unknown to our narrow shape
    type PlaysShape = {
      title: string;
      author: string | null;
      is_monologue: boolean | null;
      play_ai_analysis: AnalysisRow | AnalysisRow[] | null;
    };
    const plays = (row.plays as unknown) as PlaysShape | null;
    const analysisRows = plays?.play_ai_analysis;
    const analysis: AnalysisRow | null = Array.isArray(analysisRows)
      ? (analysisRows[0] ?? null)
      : (analysisRows ?? null);
    return {
      id: row.id,
      title: plays?.title ?? "",
      author: plays?.author ?? undefined,
      role: (row.role as string[] | null) ?? undefined,
      off_book_pct: row.off_book_pct ?? 0,
      last_practiced: row.last_practiced,
      state: (row.state ?? "ready") as Play["state"],
      note: row.note ?? undefined,
      progress: row.progress ?? undefined,
      is_monologue: plays?.is_monologue ?? undefined,
      description: analysis?.description ?? undefined,
      play_type: analysis?.play_type ?? undefined,
      script_type: analysis?.script_type ?? undefined,
      detected_language: analysis?.detected_language ?? undefined,
    };
  });
}

export async function getPlayScript(userPlayId: string): Promise<{
  playId: string;
  title: string;
  author: string | null;
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
        author,
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

  type PlayRow = {
    id: string;
    title: string;
    author: string | null;
    is_sample: boolean | null;
    script_text: string | null;
    language: string | null;
    scenes: { sort_order: number; act: string; scene: string; title: string; content: unknown }[] | null;
  };

  const play = (data.plays as unknown) as PlayRow | null;
  if (!play) return null;

  // Any non-sample play in the user's library is editable by that user
  const canEdit: boolean = play.is_sample === false;

  // Prefer the stored raw text (exact round-trip); fall back to serializing from
  // scenes for plays that predate the script_text column (migration 008).
  let scriptText: string = play.script_text ?? "";
  if (!scriptText && play.scenes && play.scenes.length > 0) {
    const sorted = [...play.scenes].sort((a, b) => a.sort_order - b.sort_order);
    scriptText = serializeSSF(sorted as Parameters<typeof serializeSSF>[0]);
  }

  return {
    playId: play.id,
    title: play.title,
    author: play.author,
    language: play.language,
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
          play_type, script_type,
          detected_language,
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
