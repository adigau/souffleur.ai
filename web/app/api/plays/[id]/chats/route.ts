import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: up } = await supabase
    .from("user_plays")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!up) return Response.json({ error: "Not found" }, { status: 404 });

  const { data: sessions } = await supabase
    .from("play_chat_sessions")
    .select("id, title, created_at, messages")
    .eq("user_play_id", id)
    .order("created_at", { ascending: false });

  const result = (sessions ?? []).map((s) => {
    const msgs = (s.messages as any[]) ?? [];
    const firstUser = msgs.find((m) => m.role === "user");
    const preview = firstUser?.parts?.find((p: any) => p.type === "text")?.text as string | undefined;
    return {
      id: s.id,
      title: s.title as string | null,
      created_at: s.created_at,
      preview: preview ? (preview.length > 80 ? preview.slice(0, 80) + "…" : preview) : null,
    };
  });

  return Response.json(result);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: up } = await supabase
    .from("user_plays")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!up) return Response.json({ error: "Not found" }, { status: 404 });

  const { data: session, error } = await supabase
    .from("play_chat_sessions")
    .insert({ user_play_id: id })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: session.id });
}
