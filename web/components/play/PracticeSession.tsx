"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { usePlayRoles } from "@/contexts/PlayRolesContext";
import type { ContentEntry } from "@/lib/script-types";
import { Chev } from "@/components/ui/Icons";

interface Scene {
  id: string;
  act: string;
  scene: string;
  sort_order: number;
  title?: string;
  content: ContentEntry[];
}

interface PracticeSessionProps {
  scenes: Scene[];
  userPlayId: string;
  initialSceneId?: string;
  language?: string | null;
}

const TTS_LANG: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  ru: "ru-RU",
  nl: "nl-NL",
  pl: "pl-PL",
  sv: "sv-SE",
};

interface Entry {
  content: ContentEntry;
  isLine: boolean;
  showChar: boolean;
  isYou: boolean;
}

function sceneLabel(s: Scene): string {
  if (s.title) {
    const short = s.title.replace(/^Scene\s+\d+\s*:\s*/i, "");
    return short.length > 30 ? short.slice(0, 29) + "…" : short;
  }
  if (s.act) return s.act;
  return `Scene ${s.sort_order ?? 1}`;
}

function sceneHasRole(s: Scene, roles: string[]): boolean {
  if (!roles.length) return false;
  return s.content.some(
    (e) => (e.type ?? "line") === "line" && roles.includes(e.ch ?? "")
  );
}

function extractSpeechText(e: Entry): string {
  if (!e.isLine) return e.content.text ?? "";
  if (e.content.segments) {
    return e.content.segments
      .map((s) => (s.action ? `(${s.action})` : (s.text ?? "")))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return e.content.text ?? "";
}

// Render line text with a word highlighted at [start, start+length)
function LineText({
  entry,
  speechText,
  wordStart,
  wordLen,
}: {
  entry: ContentEntry;
  speechText: string;
  wordStart: number;
  wordLen: number;
}) {
  const plain = entry.text ?? "";
  const hasHighlight = wordLen > 0 && plain === speechText;

  if (entry.segments) {
    // Segmented lines: no word-level highlight, just render segments
    return (
      <>
        {entry.segments.map((seg, i) =>
          seg.action ? (
            <em key={i} style={{ color: "var(--ink-muted)", fontSize: "0.9em" }}>
              {" "}({seg.action}){" "}
            </em>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </>
    );
  }

  if (!hasHighlight) return <>{plain}</>;

  const end = wordStart + wordLen;
  return (
    <>
      {plain.slice(0, wordStart)}
      <mark
        style={{
          background: "var(--highlight)",
          color: "inherit",
          borderRadius: 2,
          padding: "0 1px",
        }}
      >
        {plain.slice(wordStart, end)}
      </mark>
      {plain.slice(end)}
    </>
  );
}

export default function PracticeSession({
  scenes,
  userPlayId,
  initialSceneId,
  language,
}: PracticeSessionProps) {
  const locale = useLocale();
  const { roles } = usePlayRoles();
  // Play-level language overrides locale; fall back to locale if not set
  const lang =
    (language && TTS_LANG[language]) ??
    (locale === "fr" ? "fr-FR" : "en-US");

  const [sceneIdx, setSceneIdx] = useState(() => {
    const idx = initialSceneId
      ? scenes.findIndex((s) => s.id === initialSceneId)
      : 0;
    return idx >= 0 ? idx : 0;
  });
  const [active, setActive] = useState(-1); // -1 = not started
  const [paused, setPaused] = useState(false);
  // { start, length } within the current entry's speech text
  const [word, setWord] = useState<{ start: number; length: number } | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const currentScene = scenes[sceneIdx];
  const hasPrev = sceneIdx > 0;
  const hasNext = sceneIdx < scenes.length - 1;

  const entries = useMemo((): Entry[] => {
    const result: Entry[] = [];
    let prevCh: string | null = null;
    for (const e of currentScene.content) {
      const t = e.type ?? "line";
      if (t === "line") {
        const isYou =
          roles.length > 0
            ? roles.includes(e.ch ?? "")
            : (e.you ?? false);
        result.push({ content: e, isLine: true, showChar: e.ch !== prevCh, isYou });
        prevCh = e.ch ?? null;
      } else if (t === "action" || t === "scene_direction" || t === "direction") {
        result.push({ content: e, isLine: false, showChar: false, isYou: false });
      }
    }
    return result;
  }, [currentScene, roles]);

  const started = active >= 0;
  const done = active >= entries.length;

  // ── TTS: restart whenever active or pause state changes ──────────────────
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    if (active < 0 || active >= entries.length || paused) return;

    const e = entries[active];

    // Stage directions are shown but never read aloud — advance immediately
    if (!e.isLine) {
      const t = setTimeout(() => setActive((i) => i + 1), 600);
      return () => clearTimeout(t);
    }

    const text = extractSpeechText(e);

    if (!text.trim()) {
      const t = setTimeout(() => setActive((i) => i + 1), 80);
      return () => clearTimeout(t);
    }

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;

    utt.onboundary = (ev) => {
      if (ev.name === "word" && ev.charLength) {
        setWord({ start: ev.charIndex, length: ev.charLength });
      }
    };
    utt.onend = () => {
      setWord(null);
      setActive((i) => (i < entries.length ? i + 1 : i));
    };
    utt.onerror = () => setWord(null);

    // Small delay so the highlighted line renders before speech begins
    const t = setTimeout(() => window.speechSynthesis.speak(utt), 80);
    return () => {
      clearTimeout(t);
      window.speechSynthesis.cancel();
      setWord(null);
    };
  }, [active, paused, sceneIdx, lang]); // paused in deps: cleanup cancels, re-run starts

  // ── Reset when scene changes ─────────────────────────────────────────────
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setWord(null);
    setActive(-1);
    setPaused(false);
  }, [sceneIdx]);

  // ── Scroll active line into view ─────────────────────────────────────────
  useEffect(() => {
    if (active >= 0) {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [active]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function handler(ev: KeyboardEvent) {
      const tag = (ev.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (
        ev.code === "Space" ||
        ev.code === "ArrowRight" ||
        ev.code === "ArrowDown"
      ) {
        ev.preventDefault();
        skip();
      }
      if (ev.code === "KeyR") { ev.preventDefault(); restart(); }
      if ((ev.code === "Escape" || ev.code === "KeyP") && started && !done) {
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, done]);

  function skip() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setWord(null);
    setPaused(false);
    setActive((i) => (i < 0 ? 0 : i < entries.length ? i + 1 : i));
  }

  function restart() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setWord(null);
    setActive(0);
    setPaused(false);
  }

  // ── Scene strip (matches ScriptView exactly) ─────────────────────────────
  const sceneStrip = (() => {
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
      const soleScene =
        group.indices.length === 1 ? scenes[group.indices[0]] : null;
      const isBareAct = !!(
        soleScene &&
        !soleScene.title &&
        !soleScene.scene &&
        group.act
      );

      if (isBareAct) {
        const s = soleScene!;
        const isActive = group.indices[0] === sceneIdx;
        const hasRole = sceneHasRole(s, roles);
        return (
          <div
            key={gi}
            style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            {gi > 0 && (
              <div
                style={{
                  width: 1,
                  height: 18,
                  background: "var(--rule)",
                  flexShrink: 0,
                  margin: "0 8px",
                }}
              />
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
                fontStyle: isActive ? "italic" : "normal",
                background: isActive ? "var(--highlight-soft)" : "transparent",
                color: isActive
                  ? "var(--accent)"
                  : hasRole
                  ? "var(--accent)"
                  : "var(--ink-faint)",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                opacity: isActive ? 1 : hasRole ? 0.85 : 1,
              }}
            >
              {group.act}
            </button>
          </div>
        );
      }

      return (
        <div
          key={gi}
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          {multipleActs && gi > 0 && (
            <div
              style={{
                width: 1,
                height: 18,
                background: "var(--rule)",
                flexShrink: 0,
                margin: "0 8px",
              }}
            />
          )}
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
          {group.indices.map((i) => {
            const s = scenes[i];
            const isActive = i === sceneIdx;
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
                  fontStyle: isActive ? "italic" : "normal",
                  background: isActive ? "var(--highlight-soft)" : "transparent",
                  color: isActive
                    ? "var(--accent)"
                    : hasRole
                    ? "var(--accent)"
                    : "var(--ink-faint)",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  opacity: isActive ? 1 : hasRole ? 0.85 : 1,
                }}
              >
                {sceneLabel(s)}
              </button>
            );
          })}
        </div>
      );
    });
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Scene selector strip */}
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
          {sceneStrip}
        </div>

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

      {/* Script scroll */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px clamp(16px, 6vw, 72px) 0",
        }}
      >
        {currentScene.title && (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--ink)",
              marginBottom: 28,
              paddingBottom: 20,
              borderBottom: "1px solid var(--rule)",
            }}
          >
            {currentScene.title.replace(/^Scene\s+\d+\s*:\s*/i, "")}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", paddingBottom: 40 }}>
          {entries.map((e, i) => {
            const isPast = started && i < active;
            const isActive = started && i === active && !done;
            const speechText = isActive ? extractSpeechText(e) : "";

            return (
              <div
                key={i}
                ref={isActive ? activeRef : undefined}
                onClick={isActive ? skip : undefined}
                style={{
                  opacity: isPast ? 0.22 : !started || isActive ? 1 : 0.65,
                  transition: "opacity 0.25s, background 0.2s, box-shadow 0.2s",
                  cursor: isActive ? "pointer" : "default",
                  borderRadius: "var(--radius-sm)",
                  ...(isActive && e.isLine
                    ? {
                        background: e.isYou
                          ? "var(--highlight-soft)"
                          : "color-mix(in oklch, var(--ink) 5%, var(--bg))",
                        boxShadow: e.isYou
                          ? "inset 4px 0 0 var(--highlight)"
                          : "inset 4px 0 0 var(--rule)",
                        padding: "10px 16px",
                        marginLeft: -16,
                        marginRight: -16,
                        marginBottom: 4,
                      }
                    : e.isLine
                    ? { padding: "5px 16px", marginLeft: -16, marginRight: -16 }
                    : { padding: "3px 0" }),
                }}
              >
                {e.isLine ? (
                  <div>
                    {e.showChar && (
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1.5,
                          color:
                            isActive && e.isYou
                              ? "var(--accent)"
                              : "var(--ink-faint)",
                          marginBottom: 3,
                        }}
                      >
                        {e.content.ch}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        lineHeight: 1.6,
                        color: "var(--ink)",
                      }}
                    >
                      <LineText
                        entry={e.content}
                        speechText={speechText}
                        wordStart={word?.start ?? 0}
                        wordLen={isActive ? (word?.length ?? 0) : 0}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: 14,
                      color: "var(--ink-faint)",
                      lineHeight: 1.5,
                    }}
                  >
                    {e.content.text}
                  </div>
                )}
              </div>
            );
          })}

          {done && (
            <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 16,
                  color: "var(--ink-faint)",
                  marginBottom: 20,
                }}
              >
                — end of scene —
              </div>
              <button
                onClick={restart}
                style={{
                  padding: "8px 24px",
                  background: "var(--ink)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: 999,
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Run it again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          flexShrink: 0,
          height: 56,
          borderTop: "1px solid var(--rule)",
          background: "var(--bg-elev)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
        }}
      >
        {started && (
          <button
            onClick={restart}
            style={{
              padding: "6px 14px",
              background: "none",
              border: "1px solid var(--rule)",
              borderRadius: 999,
              fontFamily: "var(--font-body)",
              fontSize: 12,
              color: "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            ↩ Restart
          </button>
        )}

        {started && !done && (
          <button
            onClick={() => setPaused((p) => !p)}
            style={{
              padding: "6px 14px",
              background: paused ? "var(--ink)" : "none",
              border: `1px solid ${paused ? "var(--ink)" : "var(--rule)"}`,
              borderRadius: 999,
              fontFamily: "var(--font-body)",
              fontSize: 12,
              color: paused ? "var(--bg)" : "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        )}

        <div style={{ flex: 1 }} />

        {!done && (
          <button
            onClick={skip}
            style={{
              padding: "8px 22px",
              background: "var(--ink)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 999,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {!started ? "▶  Start" : "Skip →"}
          </button>
        )}

        {done && hasNext && (
          <button
            onClick={() => setSceneIdx((i) => i + 1)}
            style={{
              padding: "8px 22px",
              background: "var(--ink)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 999,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Next scene →
          </button>
        )}
      </div>
    </div>
  );
}
