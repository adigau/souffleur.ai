import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncAudioLines } from "@/lib/ai/sync-audio-lines";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userPlayId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: upRow } = await supabase
    .from("user_plays")
    .select("play_id")
    .eq("id", userPlayId)
    .eq("user_id", user.id)
    .single();

  if (!upRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await syncAudioLines(upRow.play_id);

  return NextResponse.json({ ok: true });
}
