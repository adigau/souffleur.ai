import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AudioManifestLine {
  scene_sort_order: number;
  line_index: number;
  content_hash: string;
  word_timestamps: { word: string; time: number }[] | null;
  duration_ms: number | null;
  signed_url: string | null;
}

export async function GET(
  _req: NextRequest,
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

  const { searchParams } = new URL(_req.url);
  const sceneParam = searchParams.get("scene");

  let rowsQuery = admin
    .from("scene_audio_lines")
    .select(
      "scene_sort_order, line_index, content_hash, word_timestamps, duration_ms, storage_path"
    )
    .eq("play_id", upRow.play_id)
    .eq("generation_state", "ready")
    .order("scene_sort_order", { ascending: true })
    .order("line_index", { ascending: true });

  if (sceneParam !== null) {
    rowsQuery = rowsQuery.eq("scene_sort_order", parseInt(sceneParam, 10));
  }

  const { data: rows } = await rowsQuery;

  if (!rows || rows.length === 0) {
    return NextResponse.json([]);
  }

  // Batch-generate signed URLs (1h validity)
  const paths = rows.map((r) => r.storage_path as string).filter(Boolean);
  const { data: urlData } = await admin.storage
    .from("play-audio")
    .createSignedUrls(paths, 3600);

  const urlMap = new Map<string, string>();
  for (const u of urlData ?? []) {
    if (u.path && u.signedUrl) urlMap.set(u.path, u.signedUrl);
  }

  const manifest: AudioManifestLine[] = rows.map((r) => ({
    scene_sort_order: r.scene_sort_order,
    line_index: r.line_index,
    content_hash: r.content_hash,
    word_timestamps: r.word_timestamps as AudioManifestLine["word_timestamps"],
    duration_ms: r.duration_ms,
    signed_url: r.storage_path ? (urlMap.get(r.storage_path) ?? null) : null,
  }));

  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "private, max-age=600" },
  });
}
