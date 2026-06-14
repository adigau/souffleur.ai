import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: up } = await supabase
    .from("user_plays")
    .select("play_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!up) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: cast } = await supabase.rpc("get_play_cast", {
    p_play_id: up.play_id,
  });

  return NextResponse.json({ cast: cast ?? [] });
}
