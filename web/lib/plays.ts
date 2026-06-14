import { createClient } from "@/lib/supabase/server";
import type { Play } from "@/components/library/LibCard";

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
        is_monologue
      )
    `)
    .eq("user_id", user.id)
    .order("last_practiced", { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
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
  }));
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
        scenes (
          id,
          act,
          scene,
          sort_order,
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
