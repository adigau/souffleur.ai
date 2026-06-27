import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ScriptPdf } from "@/lib/pdf/script-pdf";
import type { ContentEntry } from "@/lib/script-types";
import type { PdfScene, PdfCharacterProfile } from "@/lib/pdf/script-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const sceneId  = searchParams.get("scene")    ?? undefined;
  const noHighlight = searchParams.get("highlight") === "false";
  const cueMode  = searchParams.get("cue")       === "true";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: up } = await supabase
    .from("user_plays")
    .select(`
      role,
      plays (
        title, author,
        play_ai_analysis ( summary, description, play_type, character_profiles ),
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
    character_profiles?: Record<string, PdfCharacterProfile> | null;
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

  const scenes: PdfScene[] = ((play.scenes ?? []) as SceneRow[])
    .sort((a, b) => a.sort_order - b.sort_order);

  const nodeBuffer = await renderToBuffer(
    <ScriptPdf
      playTitle={play.title}
      playAuthor={play.author}
      summary={aiRow?.summary ?? null}
      description={aiRow?.description ?? null}
      characterProfiles={aiRow?.character_profiles ?? null}
      scenes={scenes}
      userRoles={noHighlight ? [] : userRoles}
      sceneId={sceneId}
      cueMode={cueMode && userRoles.length > 0}
    />
  );

  const filename = sceneId
    ? `${play.title} — scene.pdf`
    : `${play.title}.pdf`;

  const buffer = new Uint8Array(nodeBuffer);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
