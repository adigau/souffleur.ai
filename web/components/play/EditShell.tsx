"use client";

import { useState, useRef, useTransition, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X, Chev } from "@/components/ui/Icons";
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

// ─── EditShell ────────────────────────────────────────────────────────────────
export default function EditShell({ userPlayId, playTitle, initialText, initialSection }: EditShellProps) {
  const locale = useLocale();
  const t = useTranslations("play");
  const prefix = locale === "fr" ? "/fr" : "";

  const [title, setTitle] = useState(playTitle);
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

  // When ScriptEditor mounts it registers a trigger we can call to save from CodeMirror directly
  const triggerEditorSave = useRef<(() => void) | null>(null);
  const scrollToLine = useRef<((line: number) => void) | null>(null);
  const latestText = useRef(initialText);
  const outlineRef = useRef<HTMLDivElement>(null);

  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warnCount = errors.filter((e) => e.severity === "warning").length;

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
          const result = await savePlayScript(userPlayId, textToSave, title);
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
    [userPlayId, title]
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
          height: 52,
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
        {/* Left: back + editable title */}
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
              minWidth: 0,
              flex: 1,
              padding: "2px 0",
              borderBottom: "1px solid transparent",
            }}
            onFocus={(e) => {
              e.target.style.borderBottomColor = "var(--accent)";
            }}
            onBlur={(e) => {
              e.target.style.borderBottomColor = "transparent";
            }}
          />
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

        {/* Right: delete + save */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
            onClick={() => triggerEditorSave.current?.()}
            disabled={isSaving || errorCount > 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--ink)",
              color: "var(--bg)",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              cursor: isSaving || errorCount > 0 ? "not-allowed" : "pointer",
              opacity: isSaving || errorCount > 0 ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {isSaving ? t("editor.saving") : t("editor.save")}
          </button>
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
                  const result = await deletePlay(userPlayId);
                  if (result.ok) {
                    window.location.href = `${prefix}/app`;
                  } else {
                    toastKey.current += 1;
                    setToast({ message: result.error ?? "Delete failed", kind: "error", id: toastKey.current });
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

      {/* ── Sticky section banner — always mounted; doubles as the structure nav ── */}
      {(() => {
        const hasSection = !!(currentSection?.h1 || currentSection?.h2);
        const canNavigate = headings.length > 0;
        const stats =
          hasSection && currentSection!.headingLine != null
            ? computeSectionStats(statsText, headings, currentSection!.headingLine)
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
                key={currentSection!.headingLine ?? `${currentSection!.h1}-${currentSection!.h2}`}
                className="souffleur-banner-content"
                style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <div style={{ width: 3, height: 16, borderRadius: 1.5, background: "var(--accent)", flexShrink: 0 }} />
                  {currentSection!.h1 && (
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
                      {currentSection!.h1}
                    </span>
                  )}
                  {currentSection!.h1 && currentSection!.h2 && (
                    <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>›</span>
                  )}
                  {currentSection!.h2 && (
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
                      {currentSection!.h2}
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

      {/* ── Editor ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <ScriptEditor
          initialText={initialText}
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
        />
      </div>

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
        {/* Left: error / warning summary */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {errorCount === 0 && warnCount === 0 ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-faint)" }}>
              {t("editor.noIssues")}
            </span>
          ) : (
            <>
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
            </>
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
    </div>
  );
}
