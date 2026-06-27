import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userPlayId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: upRow } = await supabase
    .from("user_plays")
    .select("play_id")
    .eq("id", userPlayId)
    .eq("user_id", user.id)
    .single();

  if (!upRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("scene_audio_lines")
    .select("generation_state")
    .eq("play_id", upRow.play_id);

  const counts = { total: 0, pending: 0, generating: 0, ready: 0, error: 0 };
  for (const row of rows ?? []) {
    counts.total++;
    const s = row.generation_state as keyof typeof counts;
    if (s in counts) counts[s]++;
  }

  return NextResponse.json(counts);
}
