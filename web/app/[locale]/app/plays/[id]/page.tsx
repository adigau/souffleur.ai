import { notFound } from "next/navigation";
import { getPlayById, getUserPlays } from "@/lib/plays";
import { getNotesForPlay } from "@/lib/actions/plays";
import PlayShell from "@/components/play/PlayShell";
import ScriptView from "@/components/play/ScriptView";
import PracticeSetup from "@/components/play/PracticeSetup";

interface Props {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ tab?: string; scene?: string }>;
}

export default async function PlayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab, scene: initialSceneId } = await searchParams;

  const [data, allUserPlays, initialNotes] = await Promise.all([
    getPlayById(id),
    getUserPlays(),
    getNotesForPlay(id),
  ]);

  if (!data) notFound();

  const play = data.plays as any;
  const scenes = (play.scenes as any[]).sort(
    (a: any, b: any) => a.sort_order - b.sort_order
  );

  // Extract characters + compute per-character line/word counts
  const characterSet = new Set<string>();
  const charStats: Record<string, { lines: number; words: number }> = {};

  function countWords(text?: string) {
    return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }

  for (const scene of scenes) {
    for (const entry of scene.content as any[]) {
      if ((!entry.type || entry.type === "line") && entry.ch) {
        const ch = entry.ch as string;
        characterSet.add(ch);
        if (!charStats[ch]) charStats[ch] = { lines: 0, words: 0 };
        charStats[ch].lines++;
        if (entry.text) {
          charStats[ch].words += countWords(entry.text);
        } else if (Array.isArray(entry.segments)) {
          for (const seg of entry.segments) {
            if (seg.text) charStats[ch].words += countWords(seg.text);
          }
        }
      }
    }
  }
  const characters = Array.from(characterSet);

  const activeTab = tab === "practice" ? "practice" : "read";

  const allPlays = allUserPlays.map((p) => ({ id: p.id, title: p.title }));
  const currentRoles: string[] = (data.role as string[] | null) ?? [];

  return (
    <PlayShell
      playTitle={play.title}
      userPlayId={id}
      activeTab={activeTab}
      allPlays={allPlays}
      characters={characters}
      currentRoles={currentRoles}
      charStats={charStats}
    >
      {activeTab === "read" ? (
        <ScriptView
          scenes={scenes}
          userPlayId={id}
          playTitle={play.title}
          initialNotes={initialNotes}
        />
      ) : (
        <PracticeSetup
          scenes={scenes.map((s: any) => ({
            id: s.id,
            act: s.act,
            scene: s.scene,
            title: s.title ?? undefined,
          }))}
          userPlayId={id}
          initialSceneId={initialSceneId}
        />
      )}
    </PlayShell>
  );
}
