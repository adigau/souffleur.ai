"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import MonoTag from "@/components/ui/MonoTag";
import Button from "@/components/ui/Button";
import { X, Mic, Pause, Check } from "@/components/ui/Icons";

interface ScriptLine {
  ch: string;
  text: string;
  you?: boolean;
  direction?: string;
  intent?: string;
}

interface PracticeSessionProps {
  lines: ScriptLine[];
  roles?: string[];
  ladder: number;
  loop: boolean;
  userPlayId: string;
  sceneLabel: string;
  sceneDirection?: string | null;
}

function firstLetters(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => {
      const letters = w.replace(/[^A-Za-zÀ-ÿ'’]/g, "");
      const punct = (w.match(/[.,;:!?…—]+$/) || [""])[0];
      return (letters[0] || "") + punct;
    })
    .join(" ");
}

function YourLineDisplay({
  text,
  ladder,
  revealed,
}: {
  text: string;
  ladder: number;
  revealed: boolean;
}) {
  if (revealed || ladder <= 2) {
    return (
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(18px, 3vw, 26px)",
          lineHeight: 1.45,
          color: "var(--ink)",
          background: "var(--highlight-soft)",
          boxShadow: "inset 4px 0 0 var(--highlight)",
          padding: "10px 18px",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {text}
      </div>
    );
  }
  if (ladder === 3) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(16px, 2.5vw, 22px)",
          lineHeight: 1.6,
          letterSpacing: 2,
          color: "var(--ink)",
          padding: "10px 4px",
        }}
      >
        {firstLetters(text)}
      </div>
    );
  }
  // Level 4 — off book
  return (
    <div style={{ padding: "14px 4px" }}>
      <div
        style={{
          borderTop: "1.5px dashed var(--rule)",
          position: "relative",
          height: 0,
        }}
      />
      <div
        style={{
          fontSize: 11.5,
          color: "var(--ink-faint)",
          marginTop: 12,
          fontFamily: "var(--font-mono)",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Off book — nothing shown
      </div>
    </div>
  );
}

export default function PracticeSession({
  lines,
  roles = [],
  ladder,
  loop,
  userPlayId,
  sceneLabel,
  sceneDirection,
}: PracticeSessionProps) {
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";

  const [intro, setIntro] = useState(!!sceneDirection);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<
    Array<{ line: ScriptLine; status: "clean" | "prompted" | "skipped" }>
  >([]);

  const currentLine = lines[index];
  const isYourLine = roles.length > 0
    ? roles.includes(currentLine?.ch ?? "")
    : (currentLine?.you === true);
  const prevLine = index > 0 ? lines[index - 1] : null;

  const advance = useCallback(
    (status: "clean" | "prompted" | "skipped" = "clean") => {
      if (!currentLine) return;
      const newResults = [...results, { line: currentLine, status }];
      setResults(newResults);
      setRevealed(false);

      const next = index + 1;
      if (next >= lines.length) {
        if (loop) {
          setIndex(0);
          setResults([]);
        } else {
          setDone(true);
        }
      } else {
        setIndex(next);
      }
    },
    [index, lines, loop, results, currentLine]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (paused || done) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (isYourLine) advance("clean");
        else advance();
      }
      if (e.code === "KeyR" && isYourLine && !revealed) setRevealed(true);
      if (e.code === "KeyS" && isYourLine) advance("skipped");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, done, isYourLine, revealed, advance]);

  // Auto-advance partner lines after a short read delay (level 1 = listen, otherwise tap to advance)
  const yourLineCount = lines.filter((l) => l.you).length;
  const cleanCount = results.filter((r) => r.status === "clean").length;
  const pct = yourLineCount > 0 ? Math.round((cleanCount / yourLineCount) * 100) : 0;

  if (intro && sceneDirection) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            height: 48,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            borderBottom: "1px solid var(--rule)",
            background: "var(--bg-elev)",
          }}
        >
          <Link
            href={`${prefix}/app/plays/${userPlayId}`}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-muted)", textDecoration: "none" }}
          >
            <X size={13} color="var(--ink-faint)" />
            End
          </Link>
          <MonoTag>{sceneLabel}</MonoTag>
          <div style={{ width: 24 }} />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 clamp(24px, 8vw, 80px)",
            gap: 28,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "var(--ink-faint)",
            }}
          >
            Director's note
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(15px, 2.2vw, 20px)",
              lineHeight: 1.7,
              color: "var(--ink-muted)",
              borderLeft: "2px solid var(--rule)",
              paddingLeft: 20,
            }}
          >
            {sceneDirection}
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: "14px 20px 24px", borderTop: "1px solid var(--rule)" }}>
          <button
            onClick={() => setIntro(false)}
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--ink)",
              color: "var(--bg)",
              border: "none",
              borderRadius: "var(--radius-lg)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Begin scene →
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          textAlign: "center",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Check size={24} color="var(--bg)" />
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: -0.5,
          }}
        >
          Scene done.
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 28,
            color: "var(--accent)",
            marginTop: 8,
          }}
        >
          {pct}% clean
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 8 }}>
          {cleanCount} of {yourLineCount} lines delivered without a prompt
        </div>

        {/* Results breakdown */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 24,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {[
            { label: "Clean", count: results.filter((r) => r.status === "clean").length, color: "var(--moss)" },
            { label: "Prompted", count: results.filter((r) => r.status === "prompted").length, color: "var(--accent)" },
            { label: "Skipped", count: results.filter((r) => r.status === "skipped").length, color: "var(--rose)" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.count}</div>
              <div style={{ color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1.2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 36, width: "100%", maxWidth: 320 }}>
          <Button
            size="lg"
            full
            onClick={() => {
              setIndex(0);
              setResults([]);
              setDone(false);
            }}
          >
            Run it again
          </Button>
          <Link
            href={`${prefix}/app/plays/${userPlayId}`}
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              textDecoration: "none",
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Back to script
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      {/* Session bar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg-elev)",
        }}
      >
        <Link
          href={`${prefix}/app/plays/${userPlayId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--ink-muted)",
            textDecoration: "none",
          }}
        >
          <X size={13} color="var(--ink-faint)" />
          End
        </Link>

        <MonoTag>{sceneLabel} · line {index + 1} of {lines.length}</MonoTag>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-faint)",
          }}
        >
          L{ladder}
        </div>
      </div>

      {/* Stage */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 clamp(20px, 6vw, 80px)",
          gap: 28,
        }}
      >
        {/* Previous line (cue) — dimmed */}
        {prevLine && (
          <div style={{ opacity: 0.45 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <MonoTag>{prevLine.ch}</MonoTag>
              {!prevLine.you && (
                <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>· spoken</span>
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                lineHeight: 1.5,
                color: "var(--ink-muted)",
              }}
            >
              {prevLine.text.length > 80
                ? `…${prevLine.text.slice(-60)}`
                : prevLine.text}
            </div>
          </div>
        )}

        {/* Current line */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <MonoTag color={isYourLine ? "var(--accent)" : undefined}>
              {isYourLine ? `Your line — ${currentLine.ch}` : currentLine.ch}
            </MonoTag>
            {!isYourLine && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                · partner
              </span>
            )}
          </div>

          {/* Pre-line direction */}
          {currentLine.direction && (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 12.5,
                color: "var(--ink-faint)",
                marginBottom: 8,
                lineHeight: 1.55,
              }}
            >
              {currentLine.direction}
            </div>
          )}

          {isYourLine ? (
            <YourLineDisplay text={currentLine.text} ladder={ladder} revealed={revealed} />
          ) : (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(17px, 2.5vw, 22px)",
                lineHeight: 1.5,
                color: "var(--ink)",
              }}
            >
              {currentLine.text}
            </div>
          )}

          {/* Intent — shown for your lines in read/listen mode */}
          {isYourLine && currentLine.intent && ladder <= 2 && !revealed && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--accent)",
                marginTop: 10,
                lineHeight: 1.5,
              }}
            >
              ↳ {currentLine.intent}
            </div>
          )}

          {/* Mic indicator for your lines */}
          {isYourLine && !paused && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
              <div
                style={{
                  position: "relative",
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 999,
                    border: "1px solid var(--accent)",
                    opacity: 0.25,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: "12%",
                    borderRadius: 999,
                    border: "1px solid var(--accent)",
                    opacity: 0.5,
                  }}
                />
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mic size={14} color="#fff" />
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--accent)",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Listening…
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 3 }}>
                  Press Space when done · R to reveal · S to skip
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          flexShrink: 0,
          padding: "14px 20px 24px",
          borderTop: "1px solid var(--rule)",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {isYourLine ? (
          <div style={{ display: "flex", gap: 8 }}>
            {!revealed && ladder >= 3 && (
              <Button
                variant="secondary"
                size="sm"
                full
                onClick={() => {
                  setRevealed(true);
                  // Still counts as prompted after reveal
                }}
              >
                Give me the line
              </Button>
            )}
            <Button
              size="sm"
              full
              onClick={() => advance(revealed ? "prompted" : "clean")}
            >
              {revealed ? "Got it — next" : "✓ Delivered — next"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => advance("skipped")}>
              Skip
            </Button>
          </div>
        ) : (
          <Button size="sm" full onClick={() => advance()}>
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
