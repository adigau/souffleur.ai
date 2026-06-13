import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plays: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { play_id, role } = body;

  if (!play_id) {
    return NextResponse.json({ error: "play_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_plays")
    .insert({ user_id: user.id, play_id, role })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ play: data }, { status: 201 });
}
