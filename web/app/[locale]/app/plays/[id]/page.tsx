import { notFound } from "next/navigation";
import { getPlayById, getUserPlays } from "@/lib/plays";
import { getNotesForPlay } from "@/lib/actions/plays";
import PlayShell from "@/components/play/PlayShell";
import ScriptView from "@/components/play/ScriptView";
import PracticeSession from "@/components/play/PracticeSession";

// Always fetch fresh — avoids router cache serving stale data after an edit
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ tab?: string; scene?: string; section?: string; details?: string }>;
}

export default async function PlayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab, scene: initialSceneId, section: initialSection, details } = await searchParams;

  const [data, allUserPlays, initialNotes] = await Promise.all([
    getPlayById(id),
    getUserPlays(),
    getNotesForPlay(id),
  ]);

  if (!data) notFound();

  const play = data.plays as any;
  const scenes = ((play.scenes as any[]) ?? []).sort(
    (a: any, b: any) => a.sort_order - b.sort_order
  );

  // Extract characters + compute per-character line/word counts, broken down by scene
  const characterSet = new Set<string>();
  const charStats: Record<string, { lines: number; words: number; scenes: { id: string; label: string; lines: number; words: number }[] }> = {};
  // How often each character speaks immediately before/after each other character
  const adjacency: Record<string, Record<string, number>> = {};

  // Pre-pass: collect canonical character names from single-char lines so that
  // multi-char @DISPLAY:CHAR1+CHAR2 entries can resolve case-insensitively.
  // e.g. "Clotilde" in chars → "CLOTILDE" canonical from single-char lines.
  const canonicalNameSet = new Set<string>();
  for (const scene of scenes) {
    for (const entry of scene.content as any[]) {
      if ((!entry.type || entry.type === "line") && entry.ch && !entry.chars) {
        canonicalNameSet.add(entry.ch as string);
      }
    }
  }
  function resolveCharName(name: string): string {
    if (canonicalNameSet.has(name)) return name;
    const lower = name.toLowerCase();
    for (const c of canonicalNameSet) {
      if (c.toLowerCase() === lower) return c;
    }
    return name;
  }

  function bumpAdjacency(a: string, b: string) {
    if (!adjacency[a]) adjacency[a] = {};
    adjacency[a][b] = (adjacency[a][b] ?? 0) + 1;
  }

  function countWords(text?: string) {
    return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }

  function sceneLabelFor(s: any): string {
    if (s.title) {
      const short = (s.title as string).replace(/^Scene\s+\d+\s*:\s*/i, "");
      return short.length > 28 ? short.slice(0, 27) + "…" : short;
    }
    if (s.act) return s.act;
    return `Scene ${s.sort_order ?? 1}`;
  }

  for (const scene of scenes) {
    const sceneWords = new Map<string, number>();
    const sceneLines = new Map<string, number>();
    let prevCh: string | null = null;
    for (const entry of scene.content as any[]) {
      if ((!entry.type || entry.type === "line") && entry.ch) {
        // Multi-char lines (entry.chars) credit each owner; single-char falls back to entry.ch.
        // Resolve case-insensitively so "Clotilde" in chars → canonical "CLOTILDE".
        const owners: string[] = Array.isArray(entry.chars) && entry.chars.length > 0
          ? entry.chars.map((c: string) => resolveCharName(c))
          : [entry.ch as string];
        let words = 0;
        if (entry.text) {
          words = countWords(entry.text);
        } else if (Array.isArray(entry.segments)) {
          for (const seg of entry.segments) {
            if (seg.text) words += countWords(seg.text);
          }
        }
        for (const ch of owners) {
          sceneLines.set(ch, (sceneLines.get(ch) ?? 0) + 1);
          sceneWords.set(ch, (sceneWords.get(ch) ?? 0) + words);
        }

        const primaryCh = owners[0];
        if (prevCh && prevCh !== primaryCh) {
          bumpAdjacency(prevCh, primaryCh);
          bumpAdjacency(primaryCh, prevCh);
        }
        prevCh = primaryCh;
      }
    }
    const label = sceneLabelFor(scene);
    sceneLines.forEach((lines, ch) => {
      const words = sceneWords.get(ch) ?? 0;
      characterSet.add(ch);
      if (!charStats[ch]) charStats[ch] = { lines: 0, words: 0, scenes: [] };
      charStats[ch].lines += lines;
      charStats[ch].words += words;
      charStats[ch].scenes.push({ id: scene.id, label, lines, words });
    });
  }
  const characters = Array.from(characterSet);

  const activeTab = tab === "practice" ? "practice" : "read";

  const allPlays = allUserPlays.map((p) => ({ id: p.id, title: p.title }));
  const currentRoles: string[] = (data.role as string[] | null) ?? [];

  // Any non-sample play is editable by the user who has it in their library
  const canEdit: boolean = (play as any).is_sample === false;
  const playLanguage: string | null = (play as any).language ?? null;

  const analysisState = (data as any).state as "ready" | "processing" | "attention" | undefined;

  const aiAnalysis = (play as any).play_ai_analysis;
  const aiRow = Array.isArray(aiAnalysis) ? aiAnalysis[0] : aiAnalysis;
  const scriptType: string | null = aiRow?.script_type ?? null;
  const playType: string | null = aiRow?.play_type ?? null;
  const detectedLanguage: string | null = aiRow?.detected_language ?? null;
  const initialAnalysis = aiRow ? {
    description: aiRow.description ?? null,
    summary: aiRow.summary ?? null,
    play_type: aiRow.play_type ?? null,
    script_type: aiRow.script_type ?? null,
    detected_language: aiRow.detected_language ?? null,
    character_profiles: aiRow.character_profiles ?? null,
    updated_at: aiRow.updated_at ?? null,
  } : null;

  return (
    <PlayShell
      playTitle={play.title}
      playAuthor={(play as any).author ?? null}
      userPlayId={id}
      activeTab={activeTab}
      canEdit={canEdit}
      allPlays={allPlays}
      characters={characters}
      currentRoles={currentRoles}
      charStats={charStats}
      adjacency={adjacency}
      analysisState={analysisState}
      scriptType={scriptType}
      playType={playType}
      detectedLanguage={detectedLanguage}
      initialAnalysis={initialAnalysis}
      initialDetailsOpen={details === "true"}
    >
      {activeTab === "read" ? (
        <ScriptView
          scenes={scenes}
          userPlayId={id}
          playTitle={play.title}
          initialNotes={initialNotes}
          initialSection={initialSection}
        />
      ) : (
        <PracticeSession
          scenes={scenes}
          userPlayId={id}
          initialSceneId={initialSceneId}
          language={playLanguage}
        />
      )}
    </PlayShell>
  );
}
