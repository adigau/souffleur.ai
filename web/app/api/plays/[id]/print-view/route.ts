import { createClient } from "@/lib/supabase/server";
import { generatePlayPrintHtml } from "@/lib/print/play-print";
import type { ContentEntry } from "@/lib/script-types";
import type { PrintScene, PrintCharacterProfile } from "@/lib/print/play-print";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const sceneId     = searchParams.get("scene")     ?? undefined;
  const sceneIds    = searchParams.get("scenes")?.split(",").filter(Boolean) ?? undefined;
  const noHighlight = searchParams.get("highlight")  === "false";
  const cueMode     = searchParams.get("cue")        === "true";
  const noStage     = searchParams.get("stage")      === "false";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: up } = await supabase
    .from("user_plays")
    .select(`
      role,
      plays (
        title, author,
        play_ai_analysis ( summary, description, play_type, script_type, detected_language, character_profiles ),
        scenes ( id, act, scene, sort_order, title, content )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!up) return new Response("Not found", { status: 404 });

  type AiRow = {
    summary?: string | null;
    description?: string | null;
    play_type?: string | null;
    script_type?: string | null;
    detected_language?: string | null;
    character_profiles?: Record<string, PrintCharacterProfile> | null;
  };
  type SceneRow = {
    id: string;
    act: string;
    scene: string;
    sort_order: number;
    title?: string | null;
    content: ContentEntry[];
  };
  type PlayRow = {
    title: string;
    author?: string | null;
    play_ai_analysis?: AiRow | AiRow[] | null;
    scenes?: SceneRow[] | null;
  };

  const play = (up.plays as unknown) as PlayRow | null;
  if (!play) return new Response("Not found", { status: 404 });

  const aiRaw = play.play_ai_analysis;
  const aiRow: AiRow | null = Array.isArray(aiRaw) ? (aiRaw[0] ?? null) : (aiRaw ?? null);
  const userRoles: string[] = (up.role as string[] | null) ?? [];

  const scenes: PrintScene[] = ((play.scenes ?? []) as SceneRow[])
    .sort((a, b) => a.sort_order - b.sort_order);

  const html = generatePlayPrintHtml({
    title: play.title,
    author: play.author,
    summary: aiRow?.summary ?? null,
    description: aiRow?.description ?? null,
    playType: aiRow?.play_type ?? null,
    scriptType: aiRow?.script_type ?? null,
    detectedLanguage: aiRow?.detected_language ?? null,
    characterProfiles: aiRow?.character_profiles ?? null,
    scenes,
    userRoles: noHighlight ? [] : userRoles,
    sceneId,
    sceneIds,
    cueMode: cueMode && userRoles.length > 0,
    hideStage: noStage,
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
