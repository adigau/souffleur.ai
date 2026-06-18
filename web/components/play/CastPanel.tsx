"use client";

import { useEffect, useTransition, useState } from "react";
import { X, Chev, Check } from "@/components/ui/Icons";
import { toggleUserPlayRole } from "@/lib/actions/plays";
import { usePlayRoles } from "@/contexts/PlayRolesContext";
import { useSceneNav } from "@/contexts/SceneNavContext";

interface CastMember {
  role: string;
  display_name: string;
  email: string;
  is_you: boolean;
}

interface SceneStat {
  id: string;
  label: string;
  lines: number;
  words: number;
}

interface CharStat {
  lines: number;
  words: number;
  scenes: SceneStat[];
}

interface CastPanelProps {
  userPlayId: string;
  characters: string[];
  charStats?: Record<string, CharStat>;
  adjacency?: Record<string, Record<string, number>>;
  onClose: () => void;
}

// Hover tooltip showing avatar + name + email
function PlayerTooltip({ name, email }: { name: string; email: string }) {
  const letter = (name || email || "?")[0].toUpperCase();
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        bottom: "calc(100% + 8px)",
        background: "var(--ink)",
        color: "var(--bg)",
        borderRadius: "var(--radius-lg)",
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        whiteSpace: "nowrap",
        zIndex: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "var(--accent)",
          color: "#fff",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {letter}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body)" }}>
          {name}
        </span>
        <span style={{ fontSize: 11, opacity: 0.65, fontFamily: "var(--font-mono)" }}>
          {email}
        </span>
      </div>
    </div>
  );
}

export default function CastPanel({
  userPlayId,
  characters,
  charStats = {},
  adjacency = {},
  onClose,
}: CastPanelProps) {
  const { roles, setRoles } = usePlayRoles();
  const { requestSceneJump } = useSceneNav();
  const [cast, setCast] = useState<CastMember[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/plays/${userPlayId}/cast`)
      .then((r) => r.json())
      .then((d) => setCast(d.cast ?? []))
      .catch(() => {});
  }, [userPlayId]);

  function toggleRole(ch: string) {
    const next = roles.includes(ch)
      ? roles.filter((r) => r !== ch)
      : [...roles, ch];
    setRoles(next);
    startTransition(async () => {
      await toggleUserPlayRole(userPlayId, ch);
    });
  }

  function toggleExpanded(ch: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  function jumpToScene(sceneId: string) {
    requestSceneJump(sceneId);
    onClose();
  }

  // Only entries from OTHER users (is_you: false from the DB).
  // The current user's assignment is driven entirely by local `roles` state —
  // never by the API — so stale DB entries don't bleed through as "another player".
  const otherPlayers = new Map<string, { displayName: string; email: string }>();
  for (const m of cast) {
    if (!m.is_you) {
      otherPlayers.set(m.role, { displayName: m.display_name, email: m.email });
    }
  }

  const totalWordsAll = Object.values(charStats).reduce((sum, s) => sum + s.words, 0);

  const sortedCharacters = [...characters].sort((a, b) => {
    const aYou = roles.includes(a) ? 1 : 0;
    const bYou = roles.includes(b) ? 1 : 0;
    if (aYou !== bYou) return bYou - aYou;
    return (charStats[b]?.words ?? 0) - (charStats[a]?.words ?? 0);
  });

  // How many times a given character speaks the line right before/after one of your roles
  function withYouCount(ch: string): number {
    return roles.reduce((sum, role) => sum + (adjacency[role]?.[ch] ?? 0), 0);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />

      {/* Panel */}
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
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>
            Cast
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-muted)", display: "flex" }}
          >
            <X size={16} color="currentColor" />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "24px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--ink-faint)", marginBottom: 4 }}>
            The cast
          </div>
          {roles.length > 0 && (
            <div style={{ marginBottom: 12, fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>
              Playing as{" "}
              <strong style={{ color: "var(--accent)" }}>{roles.join(", ")}</strong>
              {" "}— your lines are highlighted in the script.
            </div>
          )}

          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
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
            <span style={{ textAlign: "right" }}>You</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sortedCharacters.map((ch) => {
              const isYou = roles.includes(ch);
              const other = otherPlayers.get(ch);
              const stat = charStats[ch];
              const isOpen = expanded.has(ch);
              const top3 = stat ? [...stat.scenes].sort((a, b) => b.words - a.words).slice(0, 3) : [];
              const pctOfScript = stat && totalWordsAll > 0 ? Math.round((stat.words / totalWordsAll) * 100) : 0;
              const avgWordsPerLine = stat && stat.lines > 0 ? (stat.words / stat.lines).toFixed(1) : "—";
              const sceneCount = stat?.scenes.length ?? 0;
              const withYou = roles.length > 0 && !isYou ? withYouCount(ch) : 0;
              const topPartnersForRole = isYou
                ? Object.entries(adjacency[ch] ?? {})
                    .filter(([other]) => !roles.includes(other))
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                : [];

              return (
                <div
                  key={ch}
                  style={{
                    borderRadius: "var(--radius-md)",
                    background: isYou
                      ? "color-mix(in oklch, var(--accent) 8%, var(--surface))"
                      : "var(--surface)",
                    border: `1px solid ${isYou ? "var(--accent)" : "var(--rule)"}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      gap: "0 12px",
                      alignItems: "center",
                      padding: "10px 12px",
                    }}
                  >
                    {/* Character name — click expands additional stats */}
                    <button
                      onClick={() => toggleExpanded(ch)}
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
                          color: isYou ? "var(--accent)" : "var(--ink)",
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

                    {/* You — checkbox toggles whether you play this role */}
                    <div
                      style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}
                      onMouseEnter={() => other ? setHoveredRole(ch) : undefined}
                      onMouseLeave={() => setHoveredRole(null)}
                    >
                      {other && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            background: "var(--ink-faint)",
                            color: "var(--bg-elev)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {(other.displayName || other.email || "?")[0].toUpperCase()}
                        </span>
                      )}

                      <button
                        onClick={() => toggleRole(ch)}
                        disabled={isPending}
                        aria-pressed={isYou}
                        title={isYou ? "You play this role — click to remove" : "Mark as your role"}
                        style={{
                          width: 19,
                          height: 19,
                          flexShrink: 0,
                          padding: 0,
                          borderRadius: 5,
                          border: `1.5px solid ${isYou ? "var(--accent)" : "var(--rule)"}`,
                          background: isYou ? "var(--accent)" : "var(--surface)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          opacity: isPending ? 0.6 : 1,
                          transition: "background 0.12s, border-color 0.12s",
                        }}
                      >
                        {isYou && <Check size={11} color="#fff" />}
                      </button>

                      {hoveredRole === ch && other && (
                        <PlayerTooltip name={other.displayName} email={other.email} />
                      )}
                    </div>
                  </div>

                  {/* Expanded stats */}
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
                            {pctOfScript}%
                          </span>
                          <span style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>of script words</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                            {avgWordsPerLine}
                          </span>
                          <span style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>words / line</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                            {sceneCount}
                          </span>
                          <span style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>scenes</span>
                        </div>
                        {withYou > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                              {withYou}
                            </span>
                            <span style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>lines with you</span>
                          </div>
                        )}
                      </div>

                      {topPartnersForRole.length > 0 && (
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
                            Plays most with
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {topPartnersForRole.map(([name, count]) => (
                              <div
                                key={name}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: 12,
                                  padding: "3px 5px",
                                }}
                              >
                                <span style={{ color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {name}
                                </span>
                                <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-faint)", flexShrink: 0, marginLeft: 8 }}>
                                  {count}×
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

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
                              <button
                                key={i}
                                onClick={() => jumpToScene(s.id)}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--line)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  width: "100%",
                                  fontSize: 12,
                                  background: "transparent",
                                  border: "none",
                                  padding: "3px 5px",
                                  borderRadius: "var(--radius-sm)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <span style={{ color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {s.label}
                                </span>
                                <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-faint)", flexShrink: 0, marginLeft: 8 }}>
                                  {s.words}w
                                </span>
                              </button>
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
        </div>
      </div>
    </div>
  );
}
