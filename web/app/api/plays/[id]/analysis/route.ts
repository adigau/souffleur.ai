import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function resolvePlayId(supabase: Awaited<ReturnType<typeof createClient>>, userPlayId: string, userId: string) {
  const { data } = await supabase
    .from("user_plays")
    .select("play_id")
    .eq("id", userPlayId)
    .eq("user_id", userId)
    .single();
  return data?.play_id ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playId = await resolvePlayId(supabase, id, user.id);
  if (!playId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data }, { data: upRow }] = await Promise.all([
    supabase
      .from("play_ai_analysis")
      .select("description, summary, play_type, play_type_options, script_type, script_type_options, detected_language, detected_language_options, character_profiles, updated_at")
      .eq("play_id", playId)
      .maybeSingle(),
    supabase
      .from("user_plays")
      .select("state, progress")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    analysis: data ?? null,
    state: upRow?.state ?? null,
    progress: upRow?.progress ?? null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playId = await resolvePlayId(supabase, id, user.id);
  if (!playId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["description", "summary", "play_type", "script_type", "detected_language", "character_profiles"] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const { error } = await supabase
    .from("play_ai_analysis")
    .update(patch)
    .eq("play_id", playId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
