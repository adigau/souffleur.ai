"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
