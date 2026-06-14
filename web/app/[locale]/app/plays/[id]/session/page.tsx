import { notFound } from "next/navigation";
import { getPlayById } from "@/lib/plays";
import PracticeSession from "@/components/play/PracticeSession";

interface Props {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ scene?: string; ladder?: string; loop?: string }>;
}

export default async function SessionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { scene: sceneId, ladder: ladderStr, loop: loopStr } = await searchParams;

  const data = await getPlayById(id);
  if (!data) notFound();

  const play = data.plays as any;
  const scenes = (play.scenes as any[]).sort(
    (a: any, b: any) => a.sort_order - b.sort_order
  );

  const scene = sceneId
    ? scenes.find((s: any) => s.id === sceneId) ?? scenes[0]
    : scenes[0];

  if (!scene) notFound();

  const ladder = Math.min(4, Math.max(1, Number(ladderStr ?? 2)));
  const loop = loopStr !== "false";

  const roles: string[] = (data.role as string[] | null) ?? [];

  // Separate scene direction from deliverable lines
  const sceneDirection = (scene.content as any[]).find(
    (e: any) => e.type === "scene_direction"
  )?.text ?? null;

  const lines = (scene.content as any[])
    .filter((e: any) => !e.type || e.type === "line")
    .map((line: any) => ({
      ...line,
      you: roles.length > 0 ? roles.includes(line.ch) : (line.you ?? false),
    }));

  const sceneLabel = `Act ${scene.act} · Scene ${scene.scene}`;

  return (
    <div style={{ height: "100dvh", overflow: "hidden" }}>
      <PracticeSession
        lines={lines}
        roles={roles}
        ladder={ladder}
        loop={loop}
        userPlayId={id}
        sceneLabel={sceneLabel}
        sceneDirection={sceneDirection}
      />
    </div>
  );
}
