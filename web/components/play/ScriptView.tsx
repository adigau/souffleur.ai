"use client";

import { useState, useRef, useEffect, useTransition, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mic, Chev, NotePen, Sparkle, X as XIcon, ArrowRight } from "@/components/ui/Icons";
import { upsertLineNote } from "@/lib/actions/plays";
import { usePlayRoles } from "@/contexts/PlayRolesContext";
import { useSceneNav } from "@/contexts/SceneNavContext";
import { useCoach } from "@/contexts/CoachContext";

// Re-export shared types from the server-safe types module (no "use client" boundary there)
export type { ParatextType, LineSegment, ContentEntry } from "@/lib/script-types";
import type { ParatextType, LineSegment, ContentEntry } from "@/lib/script-types";

interface Scene {
  id: string;
  act: string;
  scene: string;
  sort_order: number;
  title?: string;
  content: ContentEntry[];
}

interface ScriptViewProps {
  scenes: Scene[];
  userPlayId: string;
  playTitle: string;
  initialNotes?: Record<string, string>;
  initialSection?: string;
}

// ─── Note popover ────────────────────────────────────────────────────────────
function NotePopover({
  initial,
  onSave,
  onClose,
}: {
  initial: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("play");
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 50,
        top: "100%",
        left: 0,
        right: 0,
        marginTop: 6,
        background: "var(--bg-elev)",
        border: "1px solid var(--accent)",
        borderRadius: "var(--radius-lg)",
        padding: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
      }}
    >
      <textarea
        ref={ref}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("script.noteHint")}
        rows={3}
        style={{
          width: "100%",
          resize: "none",
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 15,
          color: "var(--ink)",
          lineHeight: 1.6,
        }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{
            padding: "5px 12px",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            background: "transparent",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            color: "var(--ink-muted)",
          }}
        >
          {t("script.noteCancel")}
        </button>
        <button
          onClick={() => { onSave(value); onClose(); }}
          style={{
            padding: "5px 12px",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            background: "var(--accent)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          {t("script.noteSave")}
        </button>
      </div>
    </div>
  );
}

// ─── Paratext blocks ──────────────────────────────────────────────────────────
function PlayOpen({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: 15,
        color: "var(--ink-muted)",
        lineHeight: 1.7,
        borderTop: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        padding: "16px 0",
        marginBottom: 8,
        whiteSpace: "pre-line",
      }}
    >
      {text}
    </div>
  );
}

function ActOpen({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: 16,
        color: "var(--ink-muted)",
        lineHeight: 1.65,
        borderLeft: "2px solid var(--accent)",
        paddingLeft: 16,
      }}
    >
      {text}
    </div>
  );
}

function SceneOpen({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: 16,
        color: "var(--ink-muted)",
        lineHeight: 1.7,
        borderLeft: "2px solid var(--rule)",
        paddingLeft: 16,
        marginBottom: 4,
      }}
    >
      {text}
    </div>
  );
}

function ActionStage({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: 15,
        color: "var(--ink-muted)",
        paddingLeft: 4,
        lineHeight: 1.6,
      }}
    >
      [{text}]
    </div>
  );
}

function SceneClose({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: 15,
        color: "var(--ink-muted)",
        textAlign: "center",
        lineHeight: 1.6,
        padding: "12px 0 6px",
        borderTop: "1px solid var(--rule)",
        marginTop: 8,
      }}
    >
      {text}
    </div>
  );
}

// ─── Character stats popover (hover card) ─────────────────────────────────────
function CharacterStatsPopover({
  charName,
  stats,
  currentSceneId,
  scenes,
  onJumpToScene,
}: {
  charName: string;
  stats: CharStats;
  currentSceneId: string;
  scenes: Scene[];
  onJumpToScene: (idx: number) => void;
}) {
  const t = useTranslations("play");
  const thisScene = stats.perScene.find((p) => p.sceneId === currentSceneId);
  const top3 = [...stats.perScene].sort((a, b) => b.words - a.words).slice(0, 3);

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 60,
        top: "calc(100% + 6px)",
        left: 0,
        width: 230,
        background: "var(--bg-elev)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
        padding: 12,
        fontFamily: "var(--font-body)",
        cursor: "default",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--ink-faint)",
          marginBottom: 8,
        }}
      >
        {charName}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--ink-muted)" }}>{t("script.thisScene")}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink)" }}>
          {thisScene?.lines ?? 0} lines · {thisScene?.words ?? 0}w
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: top3.length > 0 ? 10 : 0 }}>
        <span style={{ color: "var(--ink-muted)" }}>{t("script.total")}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink)" }}>
          {stats.totalLines} lines · {stats.totalWords}w
        </span>
      </div>

      {top3.length > 0 && (
        <>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "var(--ink-faint)",
              borderTop: "1px solid var(--rule)",
              paddingTop: 8,
              marginBottom: 5,
            }}
          >
            {t("script.topScenes")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {top3.map((t) => {
              const idx = scenes.findIndex((s) => s.id === t.sceneId);
              if (idx === -1) return null;
              return (
                <button
                  key={t.sceneId}
                  onClick={(e) => { e.stopPropagation(); onJumpToScene(idx); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--line)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: "3px 5px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--ink)",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sceneLabel(scenes[idx])}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-faint)", flexShrink: 0, marginLeft: 8 }}>
                    {t.words}w
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Line entry ───────────────────────────────────────────────────────────────
function ScriptLine({
  entry,
  isYou,
  isContinuation,
  isSoleVoice,
  lineIdx,
  userPlayId,
  note,
  onNoteChange,
}: {
  entry: ContentEntry;
  isYou: boolean;
  isContinuation: boolean;
  isSoleVoice: boolean;
  lineIdx: number;
  userPlayId: string;
  note: string;
  onNoteChange: (lineIdx: number, text: string) => void;
}) {
  const t = useTranslations("play");
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative", marginTop: isContinuation ? -10 : 0 }}>
      {/* Character name + cue — omitted for continuation lines */}
      {!isContinuation && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: isYou ? "var(--accent)" : "var(--ink-muted)",
            }}
          >
            {entry.ch}{isYou ? " · you" : ""}
          </span>
          {isSoleVoice && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 400,
                textTransform: "none",
                letterSpacing: 0,
                color: "var(--ink-faint)",
                border: "1px solid var(--rule)",
                borderRadius: 3,
                padding: "1px 4px",
                opacity: 0.65,
                verticalAlign: "middle",
              }}
            >
              ×1
            </span>
          )}
          {entry.direction && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--ink-muted)",
              }}
            >
              ({entry.direction})
            </span>
          )}
        </div>
      )}

      {/* Line text */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          lineHeight: 1.6,
          color: "var(--ink)",
          background: isYou ? "var(--highlight-soft)" : "transparent",
          boxShadow: isYou ? "inset 3px 0 0 var(--highlight)" : "none",
          padding: isYou ? "5px 12px" : "0",
          marginLeft: isYou ? -12 : 0,
          borderRadius: "var(--radius-sm)",
        }}
      >
        {entry.segments ? (
          entry.segments.map((seg, si) =>
            seg.action ? (
              <span
                key={si}
                style={{
                  fontStyle: "italic",
                  fontSize: 15,
                  color: "var(--ink-muted)",
                }}
              >
                {" "}({seg.action}){" "}
              </span>
            ) : (
              <span key={si}>{seg.text}</span>
            )
          )
        ) : (
          entry.text
        )}
      </div>

      {/* Intent */}
      {isYou && entry.intent && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--accent)",
            marginTop: 2,
            paddingLeft: 2,
            lineHeight: 1.55,
            opacity: 0.85,
          }}
        >
          {entry.intent}
        </div>
      )}

      {/* Actor note (display) */}
      {note && !noteOpen && (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--ink-muted)",
            background: "color-mix(in oklch, var(--accent) 6%, var(--surface))",
            border: "1px solid color-mix(in oklch, var(--accent) 20%, transparent)",
            borderRadius: "var(--radius-md)",
            padding: "5px 10px",
            lineHeight: 1.55,
            cursor: "pointer",
            marginTop: 2,
          }}
          onClick={() => setNoteOpen(true)}
        >
          ✏ {note}
        </div>
      )}

      {/* Note pen button (hover) */}
      <button
        onClick={() => setNoteOpen(true)}
        title={note ? t("script.noteEdit") : t("script.noteAdd")}
        className="note-btn"
        style={{
          position: "absolute",
          right: -30,
          top: 0,
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          opacity: note ? 0.6 : 0,
          color: note ? "var(--accent)" : "var(--ink-faint)",
          padding: 0,
        }}
      >
        <NotePen size={14} color="currentColor" />
      </button>

      {/* Note popover */}
      {noteOpen && (
        <NotePopover
          initial={note}
          onSave={(text) => onNoteChange(lineIdx, text)}
          onClose={() => setNoteOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sceneHasRole(scene: Scene, roles?: string[]): boolean {
  return scene.content.some((entry) => {
    if ((entry.type ?? "line") !== "line") return false;
    const owners = entry.chars ?? (entry.ch ? [entry.ch] : []);
    return roles?.length ? owners.some((ch) => roles.includes(ch)) : (entry.you === true);
  });
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function entryWordCount(entry: ContentEntry): number {
  if (entry.segments) {
    return entry.segments.reduce((sum, seg) => sum + (seg.text ? countWords(seg.text) : 0), 0);
  }
  return entry.text ? countWords(entry.text) : 0;
}

interface CharSceneStats {
  sceneId: string;
  lines: number;
  words: number;
}

interface CharStats {
  totalLines: number;
  totalWords: number;
  perScene: CharSceneStats[];
}

function computeCharacterStats(scenes: Scene[]): Map<string, CharStats> {
  const map = new Map<string, CharStats>();
  scenes.forEach((scene) => {
    const sceneWords = new Map<string, number>();
    const sceneLines = new Map<string, number>();
    scene.content.forEach((entry) => {
      if ((entry.type ?? "line") !== "line" || !entry.ch) return;
      const owners = entry.chars ?? [entry.ch];
      const wc = entryWordCount(entry);
      owners.forEach((ch) => {
        sceneWords.set(ch, (sceneWords.get(ch) ?? 0) + wc);
        sceneLines.set(ch, (sceneLines.get(ch) ?? 0) + 1);
      });
    });
    sceneWords.forEach((words, ch) => {
      const lines = sceneLines.get(ch) ?? 0;
      const existing = map.get(ch) ?? { totalLines: 0, totalWords: 0, perScene: [] };
      existing.totalLines += lines;
      existing.totalWords += words;
      existing.perScene.push({ sceneId: scene.id, lines, words });
      map.set(ch, existing);
    });
  });
  return map;
}

function sceneLabel(s: Scene): string {
  if (s.title) {
    // Strip "Scene N:" prefix and truncate
    const short = s.title.replace(/^Scene\s+\d+\s*:\s*/i, "");
    return short.length > 22 ? short.slice(0, 21) + "…" : short;
  }
  // No scene-level title — this row is really just an act (single heading level)
  if (s.act) return s.act;
  return `Scene ${s.sort_order ?? 1}`;
}


// ─── Main ScriptView ──────────────────────────────────────────────────────────
export default function ScriptView({
  scenes,
  userPlayId,
  initialNotes = {},
  initialSection,
}: ScriptViewProps) {
  const t = useTranslations("play");
  const { roles } = usePlayRoles();
  const { requestedSceneId, clearSceneJump, setCurrentReadSceneTitle } = useSceneNav();
  const { openCoach } = useCoach();
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";

  const [sceneIdx, setSceneIdx] = useState(() => {
    if (initialSection) {
      const idx = scenes.findIndex(
        (s) =>
          s.title === initialSection ||
          s.act === initialSection ||
          (s.title ?? "").replace(/^Scene\s+\d+\s*:\s*/i, "") === initialSection
      );
      if (idx >= 0) return idx;
    }
    return 0;
  });
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [, startTransition] = useTransition();
  const [handledSceneRequest, setHandledSceneRequest] = useState<string | null>(null);

  // Adjust sceneIdx in response to a jump request from elsewhere (e.g. CastPanel) —
  // done during render, not an effect, since it's purely derived from requestedSceneId.
  if (requestedSceneId && requestedSceneId !== handledSceneRequest) {
    setHandledSceneRequest(requestedSceneId);
    const idx = scenes.findIndex((s) => s.id === requestedSceneId);
    if (idx !== -1) setSceneIdx(idx);
  }

  const charLineCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const scene of scenes) {
      for (const entry of scene.content) {
        if ((entry.type ?? "line") === "line" && entry.ch) {
          counts.set(entry.ch, (counts.get(entry.ch) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [scenes]);

  useEffect(() => {
    if (requestedSceneId) clearSceneJump();
  }, [requestedSceneId, clearSceneJump]);

  // Keep the context up to date so PlayShell can build the correct edit URL.
  useEffect(() => {
    const s = scenes[sceneIdx];
    setCurrentReadSceneTitle(s?.title || s?.act || null);
  }, [sceneIdx, scenes, setCurrentReadSceneTitle]);

  const currentScene = scenes[sceneIdx];
  const hasPrev = sceneIdx > 0;
  const hasNext = sceneIdx < scenes.length - 1;

  function handleNoteChange(sceneId: string, lineIdx: number, text: string) {
    const k = `${sceneId}-${lineIdx}`;
    setNotes((prev) => {
      const next = { ...prev };
      if (text.trim()) next[k] = text.trim();
      else delete next[k];
      return next;
    });
    startTransition(() => {
      upsertLineNote(userPlayId, sceneId, lineIdx, text);
    });
  }

  let lineCounter = -1;
  let prevLineCh: string | null = null;
  if (!currentScene) return null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>

      {/* ── Scene selector strip ── */}
      <div
        style={{
          height: 38,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg-elev)",
        }}
      >
        {/* Prev chevron */}
        <button
          onClick={() => setSceneIdx((i) => i - 1)}
          disabled={!hasPrev}
          style={{
            width: 36,
            height: "100%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            borderRight: "1px solid var(--rule)",
            cursor: hasPrev ? "pointer" : "default",
            opacity: hasPrev ? 1 : 0.2,
            color: "var(--ink-muted)",
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
            <Chev size={12} color="currentColor" />
          </span>
        </button>

        {/* Scene labels */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            alignItems: "center",
            gap: 0,
            padding: "0 8px",
            scrollbarWidth: "none",
          }}
        >
          {(() => {
            // Build act groups to support visual grouping
            const groups: Array<{ act: string; indices: number[] }> = [];
            scenes.forEach((s, i) => {
              const last = groups[groups.length - 1];
              if (!last || last.act !== s.act) groups.push({ act: s.act, indices: [i] });
              else last.indices.push(i);
            });
            const multipleActs = groups.length > 1;
            const activeGroupIdx = groups.findIndex((g) => g.indices.includes(sceneIdx));

            return groups.map((group, gi) => {
              const isActiveGroup = gi === activeGroupIdx;
              // A "bare act" group is a single row with no real scene title/number under it —
              // i.e. this play only has one heading level (acts). Render it flat, without
              // nesting a generic "Scene 1" button under an act chip.
              const soleScene = group.indices.length === 1 ? scenes[group.indices[0]] : null;
              const isBareAct = !!(soleScene && !soleScene.title && !soleScene.scene && group.act);

              if (isBareAct) {
                const s = soleScene!;
                const active = group.indices[0] === sceneIdx;
                const hasRole = sceneHasRole(s, roles);
                return (
                  <div key={gi} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    {gi > 0 && (
                      <div style={{ width: 1, height: 18, background: "var(--rule)", flexShrink: 0, margin: "0 8px" }} />
                    )}
                    <button
                      onClick={() => setSceneIdx(group.indices[0])}
                      style={{
                        flexShrink: 0,
                        padding: "3px 10px",
                        borderRadius: "var(--radius-md)",
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: "var(--font-display)",
                        fontStyle: active ? "italic" : "normal",
                        background: active ? "var(--highlight-soft)" : "transparent",
                        color: active ? "var(--accent)" : (hasRole ? "var(--accent)" : "var(--ink-faint)"),
                        border: "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        opacity: active ? 1 : (hasRole ? 0.85 : 1),
                      }}
                    >
                      {group.act}
                    </button>
                  </div>
                );
              }

              return (
                <div key={gi} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  {/* Divider between act groups */}
                  {multipleActs && gi > 0 && (
                    <div style={{ width: 1, height: 18, background: "var(--rule)", flexShrink: 0, margin: "0 8px" }} />
                  )}
                  {/* Act label chip — solid accent when active, neutral when not */}
                  {multipleActs && group.act && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: isActiveGroup ? "var(--bg)" : "var(--ink-muted)",
                        background: isActiveGroup ? "var(--accent)" : "var(--line)",
                        border: `1px solid ${isActiveGroup ? "var(--accent)" : "var(--rule)"}`,
                        borderRadius: "var(--radius-sm)",
                        padding: "1px 6px",
                        flexShrink: 0,
                        marginRight: 4,
                        userSelect: "none",
                      }}
                    >
                      {group.act}
                    </span>
                  )}
                  {/* Scene buttons — italic + warm highlight for active, no weight shift */}
                  {group.indices.map((i) => {
                    const s = scenes[i];
                    const active = i === sceneIdx;
                    const hasRole = sceneHasRole(s, roles);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSceneIdx(i)}
                        style={{
                          flexShrink: 0,
                          padding: "3px 10px",
                          borderRadius: "var(--radius-md)",
                          fontSize: 12,
                          fontWeight: 500,
                          fontFamily: "var(--font-display)",
                          fontStyle: active ? "italic" : "normal",
                          background: active ? "var(--highlight-soft)" : "transparent",
                          color: active
                            ? "var(--accent)"
                            : (hasRole ? "var(--accent)" : "var(--ink-faint)"),
                          border: "none",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          opacity: active ? 1 : (hasRole ? 0.85 : 1),
                        }}
                      >
                        {sceneLabel(s)}
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>

        {/* Next chevron */}
        <button
          onClick={() => setSceneIdx((i) => i + 1)}
          disabled={!hasNext}
          style={{
            width: 36,
            height: "100%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            borderLeft: "1px solid var(--rule)",
            cursor: hasNext ? "pointer" : "default",
            opacity: hasNext ? 1 : 0.2,
            color: "var(--ink-muted)",
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}>
            <Chev size={12} color="currentColor" />
          </span>
        </button>
      </div>

      {/* ── Script scroll area ── */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          padding: "36px 44px 36px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 700 }}>

          {/* Scene heading */}
          {(() => {
            const title = currentScene.title?.replace(/^Scene\s+\d+\s*:\s*/i, "") || "";
            const act = currentScene.act || "";
            // Big heading: prefer title, fall back to act, then section number
            const bigHeading = title || act || t("script.sectionFallback", { n: sceneIdx + 1 });
            // Small breadcrumb: only show act when there's also a separate title
            const breadcrumb = act && title && act !== title ? act : null;
            return (
              <div style={{ marginBottom: 32 }}>
                {breadcrumb && (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      color: "var(--ink-faint)",
                      marginBottom: 10,
                    }}
                  >
                    {breadcrumb}
                  </div>
                )}
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 34,
                    fontWeight: 500,
                    fontStyle: "italic",
                    lineHeight: 1.2,
                    color: "var(--ink)",
                    margin: 0,
                    letterSpacing: -0.5,
                  }}
                >
                  {bigHeading}
                </h2>
              </div>
            );
          })()}

          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {currentScene.content.map((entry, i) => {
              const type = entry.type ?? "line";

              if (type === "play_open") { prevLineCh = null; return <PlayOpen key={i} text={entry.text ?? ""} />; }
              if (type === "act_open" || type === "scene_open") return null;
              if (type === "scene_direction") { prevLineCh = null; return <SceneOpen key={i} text={entry.text ?? ""} />; }
              if (type === "action" || type === "direction") { prevLineCh = null; return <ActionStage key={i} text={entry.text ?? ""} />; }
              if (type === "scene_close") { prevLineCh = null; return <SceneClose key={i} text={entry.text ?? ""} />; }

              lineCounter++;
              const currentLineIdx = lineCounter;
              const owners = entry.chars ?? (entry.ch ? [entry.ch] : []);
              const isYou = roles?.length
                ? owners.some((ch) => roles.includes(ch))
                : (entry.you ?? false);
              const isContinuation = entry.ch === prevLineCh;
              prevLineCh = entry.ch ?? null;

              return (
                <ScriptLine
                  key={i}
                  entry={entry}
                  isYou={isYou}
                  isContinuation={isContinuation}
                  isSoleVoice={charLineCount.get(entry.ch!) === 1}
                  lineIdx={currentLineIdx}
                  userPlayId={userPlayId}
                  note={notes[`${currentScene.id}-${currentLineIdx}`] ?? ""}
                  onNoteChange={(idx, text) => handleNoteChange(currentScene.id, idx, text)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer: prev / practice / next ── */}
      <div
        style={{
          flexShrink: 0,
          height: 56,
          borderTop: "1px solid var(--rule)",
          background: "var(--bg)",
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {/* Prev */}
        <button
          onClick={() => setSceneIdx((i) => i - 1)}
          disabled={!hasPrev}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
            background: "none",
            border: "none",
            borderRight: "1px solid var(--rule)",
            cursor: hasPrev ? "pointer" : "default",
            opacity: hasPrev ? 1 : 0.25,
            minWidth: 0,
          }}
        >
          <span style={{ color: "var(--ink-faint)", display: "flex", flexShrink: 0 }}>
            <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
              <Chev size={13} color="currentColor" />
            </span>
          </span>
          {hasPrev && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                fontStyle: "italic",
                color: "var(--ink-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sceneLabel(scenes[sceneIdx - 1])}
            </span>
          )}
        </button>

        {/* Practice + Coach CTAs */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 10px", flexShrink: 0, gap: 8 }}>
          <button
            onClick={openCoach}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "none",
              border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
              color: "var(--accent)",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            <Sparkle size={12} color="currentColor" />
            {t("toolbar.coach")}
          </button>
          <a
            href={`${prefix}/app/plays/${userPlayId}?tab=practice&scene=${currentScene.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 18px",
              background: "var(--ink)",
              color: "var(--bg)",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              whiteSpace: "nowrap",
            }}
          >
            <Mic size={13} color="var(--bg)" />
            {t("tabs.practice")}
          </a>
        </div>

        {/* Next */}
        <button
          onClick={() => setSceneIdx((i) => i + 1)}
          disabled={!hasNext}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "0 14px",
            background: "none",
            border: "none",
            borderLeft: "1px solid var(--rule)",
            cursor: hasNext ? "pointer" : "default",
            opacity: hasNext ? 1 : 0.25,
            minWidth: 0,
          }}
        >
          {hasNext && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                fontStyle: "italic",
                color: "var(--ink-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sceneLabel(scenes[sceneIdx + 1])}
            </span>
          )}
          <span style={{ color: "var(--ink-faint)", display: "flex", flexShrink: 0 }}>
            <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}>
              <Chev size={13} color="currentColor" />
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
