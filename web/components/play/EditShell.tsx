"use client";

import { useState, useRef, useTransition, useCallback, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X, Chev } from "@/components/ui/Icons";
import { usePdfImport } from "@/contexts/PdfImportContext";
import { classifySsfLines, SSF_TOKEN_STYLES } from "@/lib/ssf-tokens";
import { savePlayScript, deletePlay } from "@/lib/actions/plays";
import type { SsfError } from "@/lib/script-format";
import dynamic from "next/dynamic";

// ─── Character parsing (real-time, from raw editor text) ──────────────────────

interface EditorSceneStat {
  label: string;
  words: number;
}

interface EditorCharStat {
  lines: number;
  words: number;
  scenes: EditorSceneStat[];
}

function parseCharacters(text: string): {
  characters: string[];
  charStats: Record<string, EditorCharStat>;
} {
  const stats: Record<string, EditorCharStat> = {};
  let currentChar: string | null = null;
  let currentH1 = "";
  let currentH2 = "";

  function sceneLabel() {
    return currentH2 || currentH1 || "";
  }

  function addWords(charName: string, words: number) {
    if (!stats[charName]) stats[charName] = { lines: 0, words: 0, scenes: [] };
    stats[charName].words += words;
    if (words === 0) return;
    const lbl = sceneLabel();
    const existing = stats[charName].scenes.find((s) => s.label === lbl);
    if (existing) existing.words += words;
    else stats[charName].scenes.push({ label: lbl, words });
  }

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || /^---+$/.test(line)) continue;

    const h1 = line.match(/^#(?!#)\s*(.*)/);
    if (h1) { currentH1 = h1[1].trim(); currentH2 = ""; currentChar = null; continue; }

    const h2 = line.match(/^##\s*(.*)/);
    if (h2) { currentH2 = h2[1].trim(); currentChar = null; continue; }

    const charLine = line.match(/^@(\S+)(.*)?$/);
    if (charLine) {
      const name = charLine[1].toUpperCase();
      currentChar = name;
      if (!stats[name]) stats[name] = { lines: 0, words: 0, scenes: [] };
      stats[name].lines++;
      const inlineText = (charLine[2] ?? "").replace(/[()]/g, " ").trim();
      if (inlineText) addWords(name, inlineText.split(/\s+/).filter(Boolean).length);
      continue;
    }

    // Dialogue continuation
    if (currentChar) {
      const words = line.replace(/[()]/g, " ").split(/\s+/).filter(Boolean).length;
      addWords(currentChar, words);
    }
  }

  const characters = Object.keys(stats).sort(
    (a, b) => (stats[b]?.words ?? 0) - (stats[a]?.words ?? 0)
  );
  return { characters, charStats: stats };
}

// ─── Characters panel (editor-only, no role toggle, no AI) ────────────────────

function CharactersPanel({
  characters,
  charStats,
  onClose,
}: {
  characters: string[];
  charStats: Record<string, EditorCharStat>;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const totalWords = Object.values(charStats).reduce((s, c) => s + c.words, 0);

  function toggle(ch: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div
        style={{
          position: "relative",
          width: "min(420px, 100vw)",
          height: "100%",
          background: "var(--bg-elev)",
          borderLeft: "1px solid var(--rule)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 52,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>
              Characters
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-faint)",
              }}
            >
              {characters.length}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-muted)", display: "flex" }}
          >
            <X size={16} color="currentColor" />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {characters.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-faint)", fontStyle: "italic", margin: 0 }}>
              No characters yet. Use <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>@NAME</code> to add one.
            </p>
          ) : (
            <>
              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: "0 12px",
                  padding: "0 12px 8px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: "var(--ink-faint)",
                }}
              >
                <span>Character</span>
                <span style={{ textAlign: "right" }}>Lines</span>
                <span style={{ textAlign: "right" }}>Words</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {characters.map((ch) => {
                  const stat = charStats[ch];
                  const isOpen = expanded.has(ch);
                  const pct = stat && totalWords > 0 ? Math.round((stat.words / totalWords) * 100) : 0;
                  const avg = stat && stat.lines > 0 ? (stat.words / stat.lines).toFixed(1) : "—";
                  const top3 = stat
                    ? [...stat.scenes]
                        .filter((s) => s.label)
                        .sort((a, b) => b.words - a.words)
                        .slice(0, 3)
                    : [];

                  return (
                    <div
                      key={ch}
                      style={{
                        borderRadius: "var(--radius-md)",
                        background: "var(--surface)",
                        border: "1px solid var(--rule)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto auto",
                          gap: "0 12px",
                          alignItems: "center",
                          padding: "10px 12px",
                        }}
                      >
                        <button
                          onClick={() => toggle(ch)}
                          disabled={!stat}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: stat ? "pointer" : "default",
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              color: "var(--ink-faint)",
                              flexShrink: 0,
                              transform: isOpen ? "rotate(90deg)" : "none",
                              transition: "transform 0.15s",
                              opacity: stat ? 1 : 0,
                            }}
                          >
                            <Chev size={9} color="currentColor" />
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--ink)",
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ch}
                          </span>
                        </button>

                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", textAlign: "right" }}>
                          {stat?.lines ?? "—"}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", textAlign: "right" }}>
                          {stat?.words ?? "—"}
                        </span>
                      </div>

                      {isOpen && stat && (
                        <div
                          style={{
                            padding: "4px 12px 12px",
                            borderTop: "1px solid var(--rule)",
                            marginTop: -1,
                          }}
                        >
                          <div style={{ display: "flex", gap: 16, padding: "10px 0 2px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                                {pct}%
                              </span>
                              <span style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>of script</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                                {avg}
                              </span>
                              <span style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>words / line</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                                {stat.scenes.length}
                              </span>
                              <span style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>scenes</span>
                            </div>
                          </div>

                          {top3.length > 0 && (
                            <>
                              <div
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 9,
                                  textTransform: "uppercase",
                                  letterSpacing: 1.2,
                                  color: "var(--ink-faint)",
                                  marginTop: 8,
                                  marginBottom: 4,
                                }}
                              >
                                Top scenes
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {top3.map((s, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      fontSize: 12,
                                      padding: "3px 5px",
                                    }}
                                  >
                                    <span style={{ color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {s.label || "—"}
                                    </span>
                                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-faint)", flexShrink: 0, marginLeft: 8 }}>
                                      {s.words}w
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const ScriptEditor = dynamic(() => import("./ScriptEditor"), { ssr: false });

interface EditShellProps {
  userPlayId: string;
  playTitle: string;
  initialAuthor: string;
  initialText: string;
  initialSection?: string;
}

// ─── Heading nav ──────────────────────────────────────────────────────────────

interface Heading {
  level: 1 | 2;
  text: string;
  lineNum: number;
}

function parseHeadings(text: string): Heading[] {
  const result: Heading[] = [];
  text.split("\n").forEach((line, i) => {
    const m2 = line.match(/^##\s*(.*)/);
    if (m2) { result.push({ level: 2, text: m2[1].trim() || "Scene", lineNum: i + 1 }); return; }
    const m1 = line.match(/^#(?!#)\s*(.*)/);
    if (m1) { result.push({ level: 1, text: m1[1].trim() || "Act", lineNum: i + 1 }); return; }
  });
  return result;
}

// ─── Scene stats (lines spoken, words, share of the whole script) ─────────────

function lineWordCount(raw: string): number {
  let body = raw.trim();
  if (!body || body.startsWith("//") || body.startsWith("#") || /^---+$/.test(body)) return 0;
  if (body.startsWith("@")) body = body.replace(/^@\S+\s*/, "");
  return body.replace(/[()]/g, " ").split(/\s+/).filter(Boolean).length;
}

function rangeStats(allLines: string[], startIdx: number, endIdxExclusive: number) {
  let words = 0;
  let cues = 0;
  for (let i = startIdx; i < endIdxExclusive; i++) {
    if (allLines[i].trim().startsWith("@")) cues++;
    words += lineWordCount(allLines[i]);
  }
  return { lines: cues, words };
}

function computeSectionStats(text: string, headings: Heading[], headingLine: number) {
  const allLines = text.split("\n");
  const totalWords = rangeStats(allLines, 0, allLines.length).words;
  const idx = headings.findIndex((h) => h.lineNum === headingLine);
  if (idx === -1) return null;
  const startIdx = headings[idx].lineNum; // 0-indexed: first line after the heading
  const nextHeadingLine = headings[idx + 1]?.lineNum;
  const endIdxExclusive = nextHeadingLine ? nextHeadingLine - 1 : allLines.length;
  const { lines, words } = rangeStats(allLines, startIdx, endIdxExclusive);
  const pct = totalWords > 0 ? Math.round((words / totalWords) * 100) : 0;
  return { lines, words, pct };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastKind = "success" | "error";

function Toast({ message, kind, duration, onDone }: { message: string; kind: ToastKind; duration?: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, duration ?? (kind === "error" ? 6000 : 3000));
    return () => clearTimeout(t);
  }, [kind, duration, onDone]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 56,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        background: kind === "success" ? "var(--ink)" : "var(--rose)",
        color: kind === "success" ? "var(--bg)" : "#fff",
        fontSize: 13,
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        padding: "10px 20px",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}

// ─── Error panel ──────────────────────────────────────────────────────────────

function ErrorPanel({
  errors,
  onNavigate,
  onClose,
}: {
  errors: SsfError[];
  onNavigate: (line: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sorted = [...errors].sort((a, b) => a.line - b.line);

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: "1px solid var(--rule)",
        background: "var(--bg-elev)",
        maxHeight: 240,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid var(--rule)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Issues · {sorted.length}
        </span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-muted)", display: "flex" }}
        >
          <X size={12} color="currentColor" />
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {sorted.map((err, i) => (
          <button
            key={i}
            onClick={() => { onNavigate(err.line); onClose(); }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              width: "100%",
              padding: "7px 12px",
              background: "none",
              border: "none",
              borderBottom: i < sorted.length - 1 ? "1px solid var(--rule)" : "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--line)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <span
              style={{
                flexShrink: 0,
                fontSize: err.severity === "error" ? 8 : 9,
                color: err.severity === "error" ? "var(--rose)" : "var(--accent)",
                marginTop: 3,
              }}
            >
              {err.severity === "error" ? "●" : "▲"}
            </span>
            <span
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-faint)",
                marginTop: 1,
                minWidth: 40,
              }}
            >
              l.{err.line}
            </span>
            <span style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>
              {err.message}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── EditShell ────────────────────────────────────────────────────────────────
export default function EditShell({ userPlayId, playTitle, initialAuthor, initialText, initialSection }: EditShellProps) {
  const locale = useLocale();
  const t = useTranslations("play");
  const prefix = locale === "fr" ? "/fr" : "";

  const [title, setTitle] = useState(playTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [errors, setErrors] = useState<SsfError[]>([]);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; duration?: number; id: number } | null>(null);
  const toastKey = useRef(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [headings, setHeadings] = useState<Heading[]>(() => parseHeadings(initialText));
  const [statsText, setStatsText] = useState(initialText);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<{ h1: string | null; h2: string | null; headingLine: number | null } | null>(null);

  // Live character parsing
  const [charData, setCharData] = useState<{ characters: string[]; charStats: Record<string, EditorCharStat> }>(
    () => parseCharacters(initialText)
  );
  const [charPanelOpen, setCharPanelOpen] = useState(false);
  const [errorPanelOpen, setErrorPanelOpen] = useState(false);

  // When ScriptEditor mounts it registers a trigger we can call to save from CodeMirror directly
  const triggerEditorSave = useRef<(() => void) | null>(null);
  const scrollToLine = useRef<((line: number) => void) | null>(null);
  const latestText = useRef(initialText);
  const outlineRef = useRef<HTMLDivElement>(null);

  // ── PDF import streaming ──────────────────────────────────────────────────
  const importCtx = usePdfImport();
  const tLib = useTranslations("library");
  // Persist done-overlay state in sessionStorage so it survives context remounts caused by revalidatePath
  const DONE_KEY = `souffleur-import-done-${userPlayId}`;
  const [importDismissed, setImportDismissed] = useState(false);
  const [localDone, setLocalDone] = useState(false);
  // Read sessionStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const val = sessionStorage.getItem(DONE_KEY);
      if (val === "dismissed") setImportDismissed(true);
      else if (val === "done") setLocalDone(true);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editorKey, setEditorKey] = useState(0);
  const [editorText, setEditorText] = useState(initialText);
  const streamScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  // Tracks latest import data so the cleanup effect can read current values at unmount
  const importSaveRef = useRef({ importCtx, title, author });

  const [doneStats, setDoneStats] = useState<{ elapsedSec: number; pageCount: number | null; importMode: string | null } | null>(null);
  const VISION_WARN_KEY = `souffleur-vision-warn-${userPlayId}`;
  const [visionWarnDismissed, setVisionWarnDismissed] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem(VISION_WARN_KEY) === "dismissed") setVisionWarnDismissed(true); }
    catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [confettiPieces] = useState(() => {
    const colors = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#a855f7","#ec4899","#14b8a6","#f43f5e"];
    return Array.from({ length: 45 }, (_, i) => ({
      id: i,
      left: `${(i * 2.22).toFixed(1)}%`,
      top: `${((i * 7.3) % 100).toFixed(1)}%`,
      width: 6 + (i % 3) * 2,
      height: 10 + (i % 4) * 3,
      color: colors[i % colors.length],
      duration: (2.2 + (i % 5) * 0.6).toFixed(2),
      delay: ((i % 9) * 0.22).toFixed(2),
    }));
  });

  // Keep ref in sync so the cleanup below can read latest values at unmount
  importSaveRef.current = { importCtx, title, author };

  // If user navigates away mid-stream, save whatever has been received so far
  useEffect(() => {
    return () => {
      const { importCtx: ctx, title: t, author: a } = importSaveRef.current;
      if (ctx.playId === userPlayId && ctx.isImporting && ctx.streamingText) {
        savePlayScript(userPlayId, ctx.streamingText, t, a || undefined).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-populate title and author from meta events
  useEffect(() => {
    if (importCtx.playId === userPlayId && importCtx.importTitle) {
      setTitle(importCtx.importTitle);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importCtx.importTitle]);

  useEffect(() => {
    if (importCtx.playId === userPlayId && importCtx.importAuthor) {
      setAuthor(importCtx.importAuthor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importCtx.importAuthor]);

  // Persist done state to sessionStorage so it survives context remounts
  useEffect(() => {
    if (importCtx.playId === userPlayId && importCtx.isDone) {
      try { sessionStorage.setItem(DONE_KEY, "done"); } catch { /* ignore */ }
      setLocalDone(true);
      setDoneStats({
        elapsedSec: importCtx.startedAt ? Math.floor((Date.now() - importCtx.startedAt) / 1000) : 0,
        pageCount: importCtx.pageCount,
        importMode: importCtx.importMode,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importCtx.isDone, importCtx.playId]);

  // Auto-scroll to bottom as text arrives, unless user has scrolled up
  useEffect(() => {
    if (!autoScrollRef.current) return;
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [importCtx.streamingText]);

  function handleStreamScroll() {
    const el = streamScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    autoScrollRef.current = atBottom;
  }

  function markDoneDismissed() {
    try { sessionStorage.setItem(DONE_KEY, "dismissed"); } catch { /* ignore */ }
  }

  // Called by all done-overlay actions (both <a> links and the "Review" button).
  // Text is already saved in the DB by the time the done overlay shows,
  // so we only reload the editor if there's still streamed text in context.
  function handleDoneOverlayDismiss() {
    const text = importCtx.streamingText;
    importCtx.clearImport();
    markDoneDismissed();
    setLocalDone(false);
    setImportDismissed(true);
    if (text) {
      latestText.current = text;
      setEditorText(text);
      setEditorKey((k) => k + 1);
    }
  }

  function handleDismissImport() {
    handleDoneOverlayDismiss();
  }

  function handleCancelImport() {
    const text = importCtx.streamingText;
    // Abort the stream and save whatever arrived so far
    importCtx.clearImport();
    if (text) {
      savePlayScript(userPlayId, text, title, author || undefined).catch(() => {});
      latestText.current = text;
      setEditorText(text);
    }
    setEditorKey((k) => k + 1);
    markDoneDismissed();
    setLocalDone(false);
    setImportDismissed(true);
  }

  const isStreaming = importCtx.playId === userPlayId && (importCtx.isImporting || importCtx.isSaving) && !importDismissed;
  const isDoneOverlay = (importCtx.playId === userPlayId && importCtx.isDone || localDone) && !importDismissed;
  const isImportError = importCtx.playId === userPlayId && !!importCtx.importError && !importDismissed;
  const isInOcrPhase = !!importCtx.ocrProgress && importCtx.streamingText.length === 0;
  const streamLineCount = importCtx.streamingText.split("\n").filter(Boolean).length;
  const streamProgress = importCtx.isDone ? 100
    : importCtx.isSaving ? 95
    : (() => {
        const textLen = importCtx.streamingText.length;
        const ocr = importCtx.ocrProgress;

        // Upload / OCR phase: max 5% — too brief to represent more
        if (textLen === 0) {
          if (ocr) return Math.max(2, Math.floor((ocr.processed / ocr.total) * 5));
          return 3;
        }

        // Claude streaming phase: 5% → 88%
        const base = 5;
        const range = 88 - base;

        if (importCtx.extractedTextLength) {
          return Math.min(88, base + Math.floor((textLen / (importCtx.extractedTextLength * 0.85)) * range));
        }
        const estimated = importCtx.pageCount ? importCtx.pageCount * 1800 : textLen * 1.5;
        return Math.min(88, base + Math.floor((textLen / estimated) * range));
      })();
  // Estimate which page Claude is currently converting
  const streamPageEst = (() => {
    const textLen = importCtx.streamingText.length;
    const pages = importCtx.pageCount;
    if (!pages || !textLen) return null;
    const totalEstChars = importCtx.extractedTextLength
      ? importCtx.extractedTextLength * 0.85
      : pages * 1800;
    return Math.min(pages, Math.max(1, Math.ceil((textLen / totalEstChars) * pages)));
  })();

  const streamElapsedSec = importCtx.startedAt ? Math.floor((Date.now() - importCtx.startedAt) / 1000) : 0;
  const streamElapsedStr = streamElapsedSec < 60
    ? `${streamElapsedSec}s`
    : `${Math.floor(streamElapsedSec / 60)}m ${streamElapsedSec % 60}s`;
  const streamStage = importCtx.isSaving ? tLib("importPdf.saving") : tLib("importPdf.reading");
  const streamDesc = importCtx.isSaving ? tLib("importPdf.savingDesc") : tLib("importPdf.startingDesc");
  const streamTimeNote = importCtx.isSaving
    ? tLib("importPdf.almostDone")
    : (() => {
        const pages = importCtx.pageCount;
        const elapsed = streamElapsedSec;
        const textLen = importCtx.streamingText.length;

        // After enough data, compute remaining time from observed throughput
        if (elapsed > 20 && textLen > 500) {
          const charsPerSec = textLen / elapsed;
          // Text mode: use exact input length; vision mode: page estimate
          const estimatedTotal = importCtx.extractedTextLength
            ? importCtx.extractedTextLength * 0.85
            : pages ? pages * 1800 : textLen * 1.5;
          const remaining = Math.max(10, (estimatedTotal - textLen) / charsPerSec);
          if (remaining < 60) return tLib("importPdf.timeUnder1");
          const minLow = Math.floor(remaining / 60);
          const minHigh = minLow + 1;
          return `~${minLow}–${minHigh} min`;
        }

        // Static initial estimate from page count (~18 sec/page)
        if (!pages) return tLib("importPdf.timeNote");
        const totalSec = pages * 18;
        if (totalSec < 60) return tLib("importPdf.timeUnder1");
        const minLow = Math.max(1, Math.floor(totalSec / 60));
        const minHigh = minLow + 1;
        return `~${minLow}–${minHigh} min`;
      })();

  // Track the latest h1/h2 heading seen in the streaming text for the section banner
  const streamSection = useMemo(() => {
    if (!isStreaming || !importCtx.streamingText) return null;
    let h1: string | null = null;
    let h2: string | null = null;
    for (const line of importCtx.streamingText.split("\n")) {
      if (/^#(?!#)/.test(line)) { h1 = line.replace(/^#\s*/, "").trim(); h2 = null; }
      else if (/^##/.test(line)) { h2 = line.replace(/^##\s*/, "").trim(); }
    }
    return (h1 || h2) ? { h1, h2 } : null;
  }, [importCtx.streamingText, isStreaming]);

  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warnCount = errors.filter((e) => e.severity === "warning").length;

  // Auto-close panel if all errors are resolved
  useEffect(() => {
    if (errors.length === 0) setErrorPanelOpen(false);
  }, [errors.length]);

  const clearToast = useCallback(() => setToast(null), []);

  // Close outline on outside click
  useEffect(() => {
    if (!outlineOpen) return;
    function onDown(e: MouseEvent) {
      if (outlineRef.current && !outlineRef.current.contains(e.target as Node)) {
        setOutlineOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [outlineOpen]);

  const handleSave = useCallback(
    (textFromEditor?: string) => {
      const textToSave = textFromEditor ?? latestText.current;
      startTransition(async () => {
        try {
          const result = await savePlayScript(userPlayId, textToSave, title, author);
          setErrors(result.errors);
          if (result.ok) {
            toastKey.current += 1;
            setToast({ message: t("editor.saved"), kind: "success", duration: 999999, id: toastKey.current });
            setTimeout(() => {
              toastKey.current += 1;
              setToast({ message: t("editor.analysingPlay"), kind: "success", id: toastKey.current });
            }, 1500);
          } else {
            const hasHardErrors = result.errors.some((e) => e.severity === "error");
            toastKey.current += 1;
            setToast({
              message: hasHardErrors
                ? t("editor.fixErrors")
                : result.dbError ?? t("editor.saveFailed"),
              kind: "error",
              id: toastKey.current,
            });
          }
        } catch (err) {
          toastKey.current += 1;
          setToast({ message: `Error: ${String(err)}`, kind: "error", id: toastKey.current });
        }
      });
    },
    [userPlayId, title, author]
  );

  const handleChange = useCallback((t: string) => {
    latestText.current = t;
    setHeadings(parseHeadings(t));
    setStatsText(t);
    setCharData(parseCharacters(t));
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--ink)",
        zIndex: 10,
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          height: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg-elev)",
          gap: 12,
        }}
      >
        {/* Left: back + editable title + author byline */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <a
            href={(() => {
              const section = currentSection?.h2 || currentSection?.h1 || null;
              return `${prefix}/app/plays/${userPlayId}${section ? `?section=${encodeURIComponent(section)}` : ""}`;
            })()}
            style={{
              display: "flex",
              alignItems: "center",
              color: "var(--ink-faint)",
              textDecoration: "none",
              flexShrink: 0,
              padding: 4,
            }}
          >
            <X size={13} color="currentColor" />
          </a>

          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("editor.titlePlaceholder")}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 500,
                fontStyle: "italic",
                color: "var(--ink)",
                background: "transparent",
                border: "none",
                outline: "none",
                width: "100%",
                padding: "1px 0",
                borderBottom: "1px solid transparent",
              }}
              onFocus={(e) => { e.target.style.borderBottomColor = "var(--accent)"; }}
              onBlur={(e)  => { e.target.style.borderBottomColor = "transparent"; }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-faint)", flexShrink: 0 }}>by</span>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={t("editor.authorPlaceholder")}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "var(--ink-muted)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  width: "100%",
                  padding: "1px 0",
                  borderBottom: "1px solid transparent",
                }}
                onFocus={(e) => { e.target.style.borderBottomColor = "var(--accent)"; }}
                onBlur={(e)  => { e.target.style.borderBottomColor = "transparent"; }}
              />
            </div>
          </div>
        </div>

        {/* Center: characters badge */}
        {charData.characters.length > 0 && (
          <button
            onClick={() => setCharPanelOpen((v) => !v)}
            title="View characters"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--rule)",
              background: charPanelOpen ? "var(--line)" : "transparent",
              color: "var(--ink-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.12s",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="4" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1 9.5c0-1.657 1.343-3 3-3s3 1.343 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="8.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.1" />
              <path d="M7 9.5c0-1.105.672-2 1.5-2s1.5.895 1.5 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            {charData.characters.length}
          </button>
        )}

        {/* Right: cancel import (during streaming) OR delete + save */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {isStreaming ? (
            <button
              onClick={handleCancelImport}
              style={{
                padding: "5px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--rule)",
                background: "transparent",
                color: "var(--ink-muted)",
                fontSize: 13,
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
            >
              {tLib("importPdf.cancelImport")}
            </button>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                title={t("editor.deleteTip")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid color-mix(in oklch, var(--rose) 40%, var(--bg))",
                  background: "transparent",
                  color: "var(--rose)",
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>

              <button
                onClick={() => {
                  if (errorCount > 0) {
                    setErrorPanelOpen(true);
                    const firstErr = errors.find((e) => e.severity === "error");
                    if (firstErr) scrollToLine.current?.(firstErr.line);
                  } else {
                    triggerEditorSave.current?.();
                  }
                }}
                disabled={isSaving}
                title={errorCount > 0 ? t("editor.fixErrors") : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 14px",
                  borderRadius: "var(--radius-md)",
                  border: errorCount > 0
                    ? "1px solid color-mix(in oklch, var(--rose) 45%, var(--bg))"
                    : "none",
                  background: errorCount > 0
                    ? "color-mix(in oklch, var(--rose) 10%, var(--bg))"
                    : "var(--ink)",
                  color: errorCount > 0 ? "var(--rose)" : "var(--bg)",
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  opacity: isSaving ? 0.5 : 1,
                  transition: "background 0.15s, border-color 0.15s, color 0.15s",
                }}
              >
                {isSaving ? (
                  t("editor.saving")
                ) : errorCount > 0 ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    {errorCount}
                  </>
                ) : (
                  t("editor.save")
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 400,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-lg)",
              padding: "28px 32px",
              maxWidth: 360,
              width: "90vw",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, marginBottom: 10 }}>
              {t("editor.deleteTitle", { title })}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 24 }}>
              {t("editor.deleteWarning")}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--rule)",
                  background: "transparent",
                  color: "var(--ink-muted)",
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                {t("editor.cancel")}
              </button>
              <button
                onClick={async () => {
                  setConfirmDelete(false);
                  const result = await deletePlay(userPlayId, `${prefix}/app`);
                  // Only reached when delete failed (success triggers redirect in server action)
                  if (!result?.ok) {
                    toastKey.current += 1;
                    setToast({ message: result?.error ?? "Delete failed", kind: "error", id: toastKey.current });
                  }
                }}
                style={{
                  padding: "7px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--rose)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                {t("editor.deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky section banner — hidden when no headings exist yet ── */}
      {(() => {
        const displaySection = isStreaming ? streamSection : currentSection;
        const hasSection = !!(displaySection?.h1 || displaySection?.h2);
        const canNavigate = !isStreaming && headings.length > 0;
        // Nothing to show — skip the banner entirely rather than render an empty bar
        if (!hasSection && !canNavigate) return null;
        const stats =
          !isStreaming && hasSection && currentSection?.headingLine != null
            ? computeSectionStats(statsText, headings, currentSection.headingLine)
            : null;
        return (
          <div ref={outlineRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => canNavigate && setOutlineOpen((v) => !v)}
            title={canNavigate ? t("editor.jumpToSection") : undefined}
            style={{
              flexShrink: 0,
              height: 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "0 18px",
              background: outlineOpen ? "var(--accent-soft)" : "var(--accent-faint)",
              borderBottom: "1px solid var(--rule)",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: canNavigate ? "pointer" : "default",
              width: "100%",
              textAlign: "left",
              overflow: "hidden",
              transition: "background 0.12s",
            }}
          >
            {hasSection && (
              <div
                key={isStreaming ? `stream-${displaySection?.h1}-${displaySection?.h2}` : (currentSection?.headingLine ?? `${displaySection?.h1}-${displaySection?.h2}`)}
                className="souffleur-banner-content"
                style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <div style={{ width: 3, height: 16, borderRadius: 1.5, background: "var(--accent)", flexShrink: 0 }} />
                  {displaySection!.h1 && (
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15,
                        fontWeight: 600,
                        fontStyle: "italic",
                        color: "var(--accent)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displaySection!.h1}
                    </span>
                  )}
                  {displaySection!.h1 && displaySection!.h2 && (
                    <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>›</span>
                  )}
                  {displaySection!.h2 && (
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15,
                        fontWeight: 500,
                        fontStyle: "italic",
                        color: "var(--ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displaySection!.h2}
                    </span>
                  )}
                  <span
                    style={{
                      display: "flex",
                      color: "var(--ink-faint)",
                      marginLeft: "auto",
                      transform: outlineOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                  >
                    <Chev size={10} color="currentColor" />
                  </span>
                </div>
                {stats && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 11 }}>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)" }}>
                        {stats.lines}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>lines</span>
                    </span>
                    <span style={{ width: 1, height: 10, background: "var(--rule)" }} />
                    <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)" }}>
                        {stats.words}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>words</span>
                    </span>
                    <span style={{ width: 1, height: 10, background: "var(--rule)" }} />
                    <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                        {stats.pct}%
                      </span>
                      <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>of script</span>
                    </span>
                  </div>
                )}
              </div>
            )}
            {!hasSection && canNavigate && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontStyle: "italic", color: "var(--ink-faint)" }}>
                  {t("editor.browseStructure")}
                </span>
                <span
                  style={{
                    display: "flex",
                    color: "var(--ink-faint)",
                    marginLeft: "auto",
                    transform: outlineOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                >
                  <Chev size={10} color="currentColor" />
                </span>
              </div>
            )}
          </button>

          {outlineOpen && canNavigate && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 1px)",
                left: 0,
                width: "min(480px, 100vw)",
                maxHeight: 360,
                overflowY: "auto",
                background: "var(--bg-elev)",
                border: "1px solid var(--rule)",
                borderTop: "none",
                borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                zIndex: 200,
              }}
            >
              <div
                style={{
                  padding: "8px 12px 6px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  color: "var(--ink-faint)",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                {t("editor.structure")}
              </div>
              {headings.map((h) => {
                const sectionStats = computeSectionStats(statsText, headings, h.lineNum);
                return (
                  <button
                    key={h.lineNum}
                    onClick={() => {
                      scrollToLine.current?.(h.lineNum);
                      setOutlineOpen(false);
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--line)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "8px 12px",
                      paddingLeft: h.level === 1 ? 12 : 28,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      gap: 8,
                      textAlign: "left",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 2,
                        height: 13,
                        flexShrink: 0,
                        borderRadius: 1,
                        background: h.level === 1 ? "var(--accent)" : "transparent",
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-display)",
                        fontSize: h.level === 1 ? 13 : 12,
                        fontWeight: h.level === 1 ? 500 : 400,
                        fontStyle: "italic",
                        color: h.level === 1 ? "var(--ink)" : "var(--ink-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {h.text}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {sectionStats && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-faint)" }}>
                          {sectionStats.lines}l · {sectionStats.words}w
                        </span>
                      )}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-faint)", opacity: 0.6 }}>
                        l.{h.lineNum}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </div>
        );
      })()}

      {/* ── Editor / Import Stream / Error ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {isStreaming ? (
          /* ── Live streaming view ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Streaming text — editor-style: gutter + line numbers + SSF syntax colours */}
            <div
              ref={streamScrollRef}
              onScroll={handleStreamScroll}
              style={{ flex: 1, overflow: "auto", background: "var(--bg)", display: "flex", alignItems: "flex-start" }}
            >
              {importCtx.streamingText.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 80,
                    gap: 12,
                    color: "var(--ink-faint)",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    style={{ animation: "spin 1.4s linear infinite", opacity: 0.5 }}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13 }}>
                    {tLib("importPdf.startingTitle")}…
                  </span>
                  {isInOcrPhase && importCtx.ocrProgress && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-faint)" }}>
                      {importCtx.ocrProgress.processed} / {importCtx.ocrProgress.total} {tLib("importPdf.pages")}
                    </span>
                  )}
                </div>
              ) : (() => {
                const classified = classifySsfLines(importCtx.streamingText);
                return (
                  <div style={{ flex: 1, padding: "24px 0", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: "1.75", userSelect: "none" }}>
                    <div style={{ maxWidth: 760 }}>
                      {classified.map(({ line, token }, idx) => {
                        const isLast = idx === classified.length - 1;
                        // Split inline (didascalies) within dialogue lines
                        const children: React.ReactNode[] = [];
                        if (token === "dialogue" && line.includes("(") && line.includes(")")) {
                          const parts = line.split(/(\([^)]*\))/g).filter(Boolean);
                          const hasAction = parts.some((p) => p.startsWith("(") && p.endsWith(")"));
                          if (hasAction) {
                            parts.forEach((p, pi) => {
                              if (p.startsWith("(") && p.endsWith(")")) {
                                children.push(<span key={pi} style={{ fontStyle: "italic", color: "var(--ink-faint)" }}>{p}</span>);
                              } else {
                                children.push(<span key={pi}>{p}</span>);
                              }
                            });
                          }
                        }
                        return (
                          <div
                            key={idx}
                            style={{ display: "flex", alignItems: "flex-start", minHeight: "1.75em" }}
                          >
                            {/* Line number — sits at the top of each logical line regardless of wrapping */}
                            <span
                              style={{
                                flexShrink: 0,
                                width: 44,
                                paddingRight: 16,
                                textAlign: "right",
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                lineHeight: "1.75",
                                color: "var(--ink-faint)",
                                opacity: 0.5,
                                userSelect: "none",
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span style={{ ...(SSF_TOKEN_STYLES[token] as React.CSSProperties), flex: 1 }}>
                              {children.length > 0 ? children : line}
                              {isLast && importCtx.isImporting && <span className="souffleur-ai-cursor" />}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Progress + status footer */}
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid var(--rule)",
                padding: "12px 16px 12px",
                background: "var(--bg-elev)",
              }}
            >
              {/* Stage + time estimate */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 2 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 600,
                    fontStyle: "italic",
                    color: "var(--ink)",
                  }}
                  className={importCtx.streamingText.length < 200 ? "souffleur-ai-text-shimmer" : undefined}
                >
                  {streamStage}
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: importCtx.isSaving ? "var(--moss)" : "var(--ink-faint)",
                    background: importCtx.isSaving ? "color-mix(in oklch, var(--moss) 10%, var(--bg))" : "var(--line)",
                    border: `1px solid ${importCtx.isSaving ? "color-mix(in oklch, var(--moss) 25%, var(--bg))" : "var(--rule)"}`,
                    padding: "2px 8px",
                    borderRadius: 99,
                  }}
                >
                  {streamTimeNote}
                </span>
              </div>
              {/* Description */}
              <div style={{ fontSize: 11.5, color: "var(--ink-muted)", lineHeight: 1.5, marginBottom: 10 }}>
                {streamDesc}
              </div>
              {/* Progress bar */}
              <div style={{ height: 5, background: "var(--line)", borderRadius: 3, marginBottom: 7, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(streamProgress, 3)}%`,
                    borderRadius: 3,
                    transition: "width 1.5s ease-out",
                    background: "linear-gradient(90deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 55%, white) 50%, var(--accent) 100%)",
                    backgroundSize: "200% 100%",
                    animation: "souffleur-shimmer 1.4s ease-in-out infinite",
                  }}
                />
              </div>
              {/* Meta row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>
                  {tLib("importPdf.lineCount", { count: streamLineCount })}
                  {streamPageEst && importCtx.pageCount && (
                    <> · {streamPageEst} / {importCtx.pageCount} {tLib("importPdf.pages")}</>
                  )}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{streamProgress}%</span>
                  <span style={{ color: "var(--rule)" }}>·</span>
                  <span>{streamElapsedStr}</span>
                </div>
              </div>
            </div>
          </div>
        ) : isImportError ? (
          /* ── Import error view ── */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 24px",
              gap: 16,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "color-mix(in oklch, var(--rose) 12%, var(--bg))",
                border: "1px solid color-mix(in oklch, var(--rose) 30%, var(--bg))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 17,
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {tLib("importPdf.failed").split(" — ")[0]}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--rose)",
                  fontFamily: "var(--font-mono)",
                  maxWidth: 360,
                  lineHeight: 1.5,
                }}
              >
                {importCtx.importError}
              </div>
            </div>
            {importCtx.streamingText.length > 0 && (
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-muted)",
                  background: "var(--bg-elev)",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 14px",
                  maxWidth: 360,
                }}
              >
                {streamLineCount} lines were captured before the error and saved to your script.
              </div>
            )}
            <button
              onClick={handleDismissImport}
              style={{
                marginTop: 4,
                padding: "9px 20px",
                borderRadius: "var(--radius-md)",
                background: "var(--ink)",
                color: "var(--bg)",
                border: "none",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Open in editor
            </button>
          </div>
        ) : (
          <ScriptEditor
            key={editorKey}
            initialText={editorText}
            onChange={handleChange}
            onSave={handleSave}
            onSaveReady={(trigger) => { triggerEditorSave.current = trigger; }}
            onScrollReady={(fn) => {
              scrollToLine.current = fn;
              if (initialSection) {
                const target = headings.find(
                  (h) => h.text.replace(/^Scene\s+\d+\s*:\s*/i, "") === initialSection.replace(/^Scene\s+\d+\s*:\s*/i, "") ||
                         h.text === initialSection
                );
                if (target) fn(target.lineNum);
              }
            }}
            onCurrentHeading={(h1, h2, headingLine) => setCurrentSection(h1 || h2 ? { h1, h2, headingLine } : null)}
            onErrors={setErrors}
          />
        )}
      </div>

      {/* ── Vision scan warning banner ── */}
      {!isStreaming && !visionWarnDismissed && doneStats?.importMode === "vision" && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 16px",
            background: "color-mix(in oklch, var(--rose) 8%, var(--bg))",
            borderTop: "1px solid color-mix(in oklch, var(--rose) 30%, var(--bg))",
            borderBottom: "1px solid color-mix(in oklch, var(--rose) 30%, var(--bg))",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style={{ flex: 1, fontSize: 12.5, color: "var(--rose)", lineHeight: 1.55 }}>
            {tLib("importPdf.visionWarning")}
          </span>
          <button
            onClick={() => {
              setVisionWarnDismissed(true);
              try { sessionStorage.setItem(VISION_WARN_KEY, "dismissed"); } catch { /* ignore */ }
            }}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              color: "var(--rose)",
              cursor: "pointer",
              padding: "0 2px",
              opacity: 0.7,
              fontSize: 16,
              lineHeight: 1,
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Error panel (above status bar, visible when errorPanelOpen) ── */}
      {errorPanelOpen && errors.length > 0 && (
        <ErrorPanel
          errors={errors}
          onNavigate={(line) => scrollToLine.current?.(line)}
          onClose={() => setErrorPanelOpen(false)}
        />
      )}

      {/* ── Status bar: issues + quick reference ── */}
      <div
        style={{
          height: 30,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderTop: "1px solid var(--rule)",
          background: "var(--bg-elev)",
          gap: 16,
        }}
      >
        {/* Left: error / warning summary — clickable to open error panel */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {errorCount === 0 && warnCount === 0 ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-faint)" }}>
              {t("editor.noIssues")}
            </span>
          ) : (
            <button
              onClick={() => setErrorPanelOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: errorPanelOpen ? "var(--line)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "2px 6px",
                cursor: "pointer",
              }}
            >
              {errorCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--rose)" }}>
                  <span style={{ fontSize: 8 }}>●</span>
                  {t("editor.errors", { count: errorCount })}
                </span>
              )}
              {warnCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--accent)" }}>
                  <span style={{ fontSize: 9 }}>▲</span>
                  {t("editor.warnings", { count: warnCount })}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Right: syntax quick reference */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            overflow: "auto",
            scrollbarWidth: "none",
          }}
        >
          {([
            ["#", t("editor.syntax.heading1")],
            ["##", t("editor.syntax.heading2")],
            ["@CHARACTER", t("editor.syntax.dialogue")],
            ["(text)", t("editor.syntax.direction")],
            ["---", t("editor.syntax.curtain")],
            ["// ...", t("editor.syntax.comment")],
          ] as [string, string][]).map(([syntax, label]) => (
            <span key={syntax} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--accent)",
                  background: "var(--accent-faint)",
                  padding: "1px 3px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {syntax}
              </code>
              <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast key={toast.id} message={toast.message} kind={toast.kind} duration={toast.duration} onDone={clearToast} />}

      {/* ── Characters panel ── */}
      {charPanelOpen && (
        <CharactersPanel
          characters={charData.characters}
          charStats={charData.charStats}
          onClose={() => setCharPanelOpen(false)}
        />
      )}

      {/* ── Import done overlay ── */}
      {isDoneOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(10, 8, 6, 0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Confetti rain */}
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              className="souffleur-confetti-rain"
              style={{
                left: p.left,
                top: p.top,
                width: p.width,
                height: p.height,
                background: p.color,
                animation: `souffleur-confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
              }}
            />
          ))}

          {/* Card */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              background: "var(--bg-elev)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-xl)",
              padding: "36px 32px 28px",
              maxWidth: 400,
              width: "90vw",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, lineHeight: 1.2, marginBottom: 10 }}>
              {tLib("importPdf.doneTitle")}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 16 }}>
              {tLib("importPdf.doneSubhead")}
            </div>

            {/* Import stats */}
            {doneStats && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                {doneStats.pageCount && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-muted)",
                      background: "var(--line)",
                      border: "1px solid var(--rule)",
                      borderRadius: 99,
                      padding: "2px 10px",
                    }}
                  >
                    {doneStats.pageCount} {tLib("importPdf.pages")}
                  </span>
                )}
                {doneStats.elapsedSec > 0 && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-muted)",
                      background: "var(--line)",
                      border: "1px solid var(--rule)",
                      borderRadius: 99,
                      padding: "2px 10px",
                    }}
                  >
                    {doneStats.elapsedSec < 60
                      ? `${doneStats.elapsedSec}s`
                      : `${Math.floor(doneStats.elapsedSec / 60)}m ${doneStats.elapsedSec % 60}s`}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: doneStats.importMode === "text" ? "var(--moss)" : "var(--ink-muted)",
                    background: doneStats.importMode === "text"
                      ? "color-mix(in oklch, var(--moss) 10%, var(--bg))"
                      : "var(--line)",
                    border: `1px solid ${doneStats.importMode === "text"
                      ? "color-mix(in oklch, var(--moss) 25%, var(--bg))"
                      : "var(--rule)"}`,
                    borderRadius: 99,
                    padding: "2px 10px",
                  }}
                >
                  {tLib(`importPdf.doneMethod_${doneStats.importMode ?? "text"}`)}
                </span>
              </div>
            )}

            {/* Vision warning */}
            {doneStats?.importMode === "vision" && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "color-mix(in oklch, var(--rose) 8%, var(--bg))",
                  border: "1px solid color-mix(in oklch, var(--rose) 35%, var(--bg))",
                  marginBottom: 20,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p style={{ margin: 0, fontSize: 13, color: "var(--rose)", lineHeight: 1.55 }}>
                  {tLib("importPdf.visionWarning")}
                </p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 24 }}>
              {[
                {
                  href: `${prefix}/app/plays/${userPlayId}?details=true`,
                  label: tLib("importPdf.doneChooseRole"),
                  desc: tLib("importPdf.doneChooseRoleDesc"),
                  icon: "🎭",
                },
                {
                  href: `${prefix}/app/plays/${userPlayId}/session`,
                  label: tLib("importPdf.doneRehearse"),
                  desc: tLib("importPdf.doneRehearseDesc"),
                  icon: "🎙",
                },
                {
                  href: null,
                  label: tLib("importPdf.doneEdit"),
                  desc: tLib("importPdf.doneEditDesc"),
                  icon: "✏️",
                },
              ].map((action, i) => (
                action.href ? (
                  <a
                    key={i}
                    href={action.href}
                    onClick={handleDoneOverlayDismiss}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      color: "var(--ink)",
                      background: "var(--surface)",
                      border: "1px solid var(--rule)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--line)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface)"; }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{action.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{action.label}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 1 }}>{action.desc}</div>
                    </div>
                  </a>
                ) : (
                  <button
                    key={i}
                    onClick={handleDismissImport}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      color: "var(--ink)",
                      background: "var(--surface)",
                      border: "1px solid var(--rule)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-body)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--line)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{action.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{action.label}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 1 }}>{action.desc}</div>
                    </div>
                  </button>
                )
              ))}
            </div>

            {/* Main CTA */}
            <a
              href={`${prefix}/app/plays/${userPlayId}`}
              onClick={handleDoneOverlayDismiss}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "11px 20px",
                borderRadius: "var(--radius-md)",
                background: "var(--ink)",
                color: "var(--bg)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                textDecoration: "none",
              }}
            >
              {tLib("importPdf.doneCta")} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
