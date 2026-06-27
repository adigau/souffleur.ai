import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rerunCoachingAnalysis } from "@/lib/ai/analyze-play";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const uiLocale: string = body.uiLocale ?? "en";

  const { data: up } = await supabase
    .from("user_plays")
    .select("play_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!up) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await rerunCoachingAnalysis(up.play_id, uiLocale, { userId: user.id, userEmail: user.email });
  if (!result) return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  const { error } = await supabase
    .from("play_ai_analysis")
    .update({
      scene_analyses: result.scene_analyses,
      character_analyses: result.character_analyses,
      updated_at: new Date().toISOString(),
    })
    .eq("play_id", up.play_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
