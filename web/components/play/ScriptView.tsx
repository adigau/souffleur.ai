"use client";

import { useState, useRef, useTransition } from "react";
import { useLocale } from "next-intl";
import { Mic, Chev, NotePen } from "@/components/ui/Icons";
import { upsertLineNote } from "@/lib/actions/plays";
import { usePlayRoles } from "@/contexts/PlayRolesContext";

// All supported paratext types + line
export type ParatextType =
  | "play_open"
  | "act_open"
  | "scene_open"
  | "scene_direction"  // legacy alias
  | "action"
  | "direction"        // legacy alias
  | "scene_close"
  | "line";

export interface LineSegment {
  text?: string;
  action?: string;
}

export interface ContentEntry {
  type?: ParatextType;
  ch?: string;
  text?: string;
  segments?: LineSegment[];
  you?: boolean;
  direction?: string;  // cue after char name: "(Aside.)"
  intent?: string;
}

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
        placeholder="Your actor note…"
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
          cancel
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
          save
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

// ─── Line entry ───────────────────────────────────────────────────────────────
function ScriptLine({
  entry,
  isYou,
  lineIdx,
  userPlayId,
  sceneId,
  note,
  onNoteChange,
}: {
  entry: ContentEntry;
  isYou: boolean;
  lineIdx: number;
  userPlayId: string;
  sceneId: string;
  note: string;
  onNoteChange: (lineIdx: number, text: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      {/* Character name + cue */}
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
        title={note ? "Edit note" : "Add actor note"}
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
    return roles?.length ? roles.includes(entry.ch ?? "") : (entry.you === true);
  });
}

function sceneLabel(s: Scene): string {
  if (s.title) {
    // Strip "Scene N:" prefix and truncate
    const short = s.title.replace(/^Scene\s+\d+\s*:\s*/i, "");
    return short.length > 22 ? short.slice(0, 21) + "…" : short;
  }
  return `Scene ${s.sort_order ?? 1}`;
}

// ─── Main ScriptView ──────────────────────────────────────────────────────────
export default function ScriptView({
  scenes,
  userPlayId,
  initialNotes = {},
}: ScriptViewProps) {
  const { roles } = usePlayRoles();
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";

  const [sceneIdx, setSceneIdx] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [, startTransition] = useTransition();

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
          {scenes.map((s, i) => {
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
                  fontWeight: active ? 600 : 400,
                  fontFamily: "var(--font-display)",
                  fontStyle: active ? "italic" : "normal",
                  background: active ? "color-mix(in oklch, var(--ink) 8%, transparent)" : "transparent",
                  color: active
                    ? (hasRole ? "var(--accent)" : "var(--ink)")
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
          <div style={{ marginBottom: 32 }}>
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
              Act {currentScene.act} · Scene {currentScene.scene}
            </div>
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
              {currentScene.title
                ? currentScene.title.replace(/^Scene\s+\d+\s*:\s*/i, "")
                : `Scene ${currentScene.sort_order ?? sceneIdx + 1}`}
            </h2>
          </div>

          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {currentScene.content.map((entry, i) => {
              const type = entry.type ?? "line";

              if (type === "play_open") return <PlayOpen key={i} text={entry.text ?? ""} />;
              if (type === "act_open") return <ActOpen key={i} text={entry.text ?? ""} />;
              if (type === "scene_open" || type === "scene_direction") return <SceneOpen key={i} text={entry.text ?? ""} />;
              if (type === "action" || type === "direction") return <ActionStage key={i} text={entry.text ?? ""} />;
              if (type === "scene_close") return <SceneClose key={i} text={entry.text ?? ""} />;

              lineCounter++;
              const currentLineIdx = lineCounter;
              const isYou = roles?.length
                ? roles.includes(entry.ch!)
                : (entry.you ?? false);

              return (
                <ScriptLine
                  key={i}
                  entry={entry}
                  isYou={isYou}
                  lineIdx={currentLineIdx}
                  userPlayId={userPlayId}
                  sceneId={currentScene.id}
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

        {/* Practice CTA */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 12px", flexShrink: 0 }}>
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
            Practice
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
