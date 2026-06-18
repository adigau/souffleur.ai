"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkle, X, Chev } from "@/components/ui/Icons";

interface ConfidenceOption {
  value: string;
  confidence: number;
}

interface CharacterProfile {
  gender: "male" | "female" | "neutral";
  age_range: "child" | "teen" | "young_adult" | "adult" | "elderly";
  description: string;
}

interface PlayAnalysis {
  description: string | null;
  summary: string | null;
  play_type: string | null;
  play_type_options: ConfidenceOption[] | null;
  detected_language: string | null;
  detected_language_options: ConfidenceOption[] | null;
  character_profiles: Record<string, CharacterProfile> | null;
  updated_at: string | null;
}

const AGE_RANGE_LABELS: Record<string, string> = {
  child: "child", teen: "teen", young_adult: "young adult",
  adult: "adult", elderly: "elderly",
};

const PLAY_TYPES = [
  "tragedy", "comedy", "tragicomedy", "drama",
  "farce", "musical", "melodrama", "historical", "thriller", "other",
];

function ShimmerLine({ width = "100%", height = 12 }: { width?: number | string; height?: number }) {
  return <div className="souffleur-shimmer" style={{ width, height, borderRadius: 3 }} />;
}

function AiBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 9,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        letterSpacing: 0.5,
        color: "var(--accent)",
        background: "var(--accent-faint)",
        padding: "1px 5px",
        borderRadius: "var(--radius-sm)",
        verticalAlign: "middle",
        marginLeft: 5,
      }}
    >
      AI
    </span>
  );
}

function languageDisplayName(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function EditableText({
  value, placeholder, onSave, multiline = false,
}: {
  value: string; placeholder: string; onSave: (v: string) => void; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
    if (!multiline && e.key === "Enter") { e.preventDefault(); commit(); }
    if (multiline && e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
  }

  const sharedStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface)",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-sm)",
    padding: "5px 8px",
    fontFamily: "var(--font-body)",
    fontSize: 13,
    color: "var(--ink)",
    outline: "none",
    lineHeight: 1.55,
    resize: "none",
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          autoFocus value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={handleKey}
          rows={3} style={sharedStyle}
        />
      );
    }
    return (
      <input
        type="text" autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={handleKey}
        style={{ ...sharedStyle, display: "block" }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontFamily: "var(--font-body)", fontSize: 13,
        color: value ? "var(--ink)" : "var(--ink-faint)",
        lineHeight: 1.55, cursor: "text", padding: "4px 0",
        borderBottom: "1px dashed var(--rule)", whiteSpace: "pre-wrap",
      }}
    >
      {value || placeholder}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--rule)",
  borderRadius: "var(--radius-sm)",
  padding: "5px 8px",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  color: "var(--ink)",
  cursor: "pointer",
  outline: "none",
};

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "var(--ink-faint)",
  marginBottom: 3,
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  color: "var(--ink-faint)",
  marginBottom: 6,
};

export default function PlayInfoPanel({
  userPlayId,
  characters = [],
  initialAnalysisState,
  onClose,
}: {
  userPlayId: string;
  characters?: string[];
  initialAnalysisState?: "ready" | "processing" | "attention";
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<PlayAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChars, setExpandedChars] = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If we have data, analysis is done — don't rely solely on the server-rendered prop
  const isProcessing = initialAnalysisState === "processing" && analysis === null;

  const fetchAnalysis = useCallback(async (): Promise<boolean> => {
    try {
      const r = await fetch(`/api/plays/${userPlayId}/analysis`);
      const d = await r.json();
      if (d.analysis) {
        setAnalysis(d.analysis);
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch {
      setLoading(false);
      return false;
    }
  }, [userPlayId]);

  useEffect(() => {
    let cancelled = false;

    function scheduleNext() {
      pollTimer.current = setTimeout(async () => {
        if (cancelled) return;
        const found = await fetchAnalysis();
        if (!found && !cancelled) scheduleNext();
      }, 3000);
    }

    fetchAnalysis().then((found) => {
      if (!found && !cancelled) scheduleNext();
    });

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [fetchAnalysis]);

  const save = useCallback(
    (patch: Partial<PlayAnalysis>) => {
      setAnalysis((prev) => prev ? { ...prev, ...patch } : prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/plays/${userPlayId}/analysis`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(console.error);
      }, 400);
    },
    [userPlayId]
  );

  function saveCharProfile(name: string, field: keyof CharacterProfile, value: string) {
    if (!analysis) return;
    const profiles = { ...(analysis.character_profiles ?? {}) };
    profiles[name] = {
      ...(profiles[name] ?? { gender: "neutral", age_range: "adult", description: "" }),
      [field]: value,
    };
    save({ character_profiles: profiles });
  }

  function toggleChar(name: string) {
    setExpandedChars((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function getConfidence(options: ConfidenceOption[] | null | undefined, value: string | null): number | null {
    if (!options || !value) return null;
    return options.find((o) => o.value === value)?.confidence ?? null;
  }

  function buildTypeOptions(opts: ConfidenceOption[] | null) {
    if (opts && opts.length > 0) {
      return opts.map((o) => ({
        value: o.value,
        label: o.value.charAt(0).toUpperCase() + o.value.slice(1),
      }));
    }
    return PLAY_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
  }

  function buildLangOptions(opts: ConfidenceOption[] | null) {
    if (!opts || opts.length === 0) return null;
    return opts.map((o) => ({
      value: o.value,
      label: languageDisplayName(o.value),
    }));
  }

  const showSkeleton = loading || (analysis === null && isProcessing);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.18)" }}
      />

      <div
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: 380,
          zIndex: 50,
          background: "var(--bg-elev)",
          borderLeft: "1px solid var(--rule)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 52,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            borderBottom: "1px solid var(--rule)",
            gap: 8,
          }}
        >
          <Sparkle size={14} color="var(--accent)" />
          <span
            style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              textTransform: "uppercase", letterSpacing: 1.2,
              color: "var(--ink)", fontWeight: 600, flex: 1,
            }}
          >
            Play info
          </span>
          {isProcessing && (
            <span
              style={{
                fontFamily: "var(--font-mono)", fontSize: 9.5,
                color: "var(--accent)", background: "var(--accent-faint)",
                padding: "2px 7px", borderRadius: "var(--radius-sm)", letterSpacing: 0.5,
              }}
            >
              Analysing…
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--ink-faint)", padding: 4, display: "flex", alignItems: "center",
            }}
          >
            <X size={13} color="currentColor" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 18px" }}>
          {showSkeleton ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* Type + Language skeleton */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={fieldLabel}>Type</div>
                  <ShimmerLine height={32} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={fieldLabel}>Language</div>
                  <ShimmerLine height={32} />
                </div>
              </div>

              {/* Description skeleton */}
              <div>
                <div style={fieldLabel}>Description</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                  <ShimmerLine height={12} />
                  <ShimmerLine width="80%" height={12} />
                  <ShimmerLine width="55%" height={12} />
                </div>
              </div>

              {/* Summary skeleton */}
              <div>
                <div style={fieldLabel}>Summary</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                  <ShimmerLine height={12} />
                  <ShimmerLine height={12} />
                  <ShimmerLine width="72%" height={12} />
                  <ShimmerLine width="40%" height={12} />
                </div>
              </div>

              {/* Character skeleton rows */}
              {characters.length > 0 && (
                <div>
                  <div style={sectionLabel}>Characters</div>
                  <div
                    style={{
                      border: "1px solid var(--rule)",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                    }}
                  >
                    {characters.map((name, idx) => (
                      <div
                        key={name}
                        style={{
                          borderBottom: idx < characters.length - 1 ? "1px solid var(--rule)" : "none",
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: 1, color: "var(--ink)", flex: 1,
                          }}
                        >
                          {name}
                        </span>
                        <ShimmerLine width={80} height={10} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing status */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 12px",
                  background: "var(--accent-faint)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid color-mix(in oklch, var(--accent) 20%, var(--rule))",
                }}
              >
                <Sparkle size={12} color="var(--accent)" />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--accent)" }}>
                  AI is analysing your play…
                </span>
              </div>
            </div>
          ) : analysis === null ? (
            <div
              style={{
                fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14,
                color: "var(--ink-faint)", lineHeight: 1.7, textAlign: "center", marginTop: 40,
              }}
            >
              AI analysis not yet available.
              <br />
              Save the script to trigger it.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* Type + Language */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={fieldLabel}>
                    Type<AiBadge />
                  </div>
                  {(() => {
                    const opts = buildTypeOptions(analysis.play_type_options ?? null);
                    return (
                      <select
                        value={analysis.play_type ?? ""}
                        onChange={(e) => save({ play_type: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="">—</option>
                        {opts.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={fieldLabel}>
                    Language<AiBadge />
                  </div>
                  {(() => {
                    const opts = buildLangOptions(analysis.detected_language_options ?? null);
                    if (opts) {
                      return (
                        <select
                          value={analysis.detected_language ?? ""}
                          onChange={(e) => save({ detected_language: e.target.value } as Partial<PlayAnalysis>)}
                          style={selectStyle}
                        >
                          <option value="">—</option>
                          {opts.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      );
                    }
                    return (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-muted)", padding: "6px 0" }}>
                        {analysis.detected_language ? languageDisplayName(analysis.detected_language) : "—"}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={fieldLabel}>Description</div>
                <EditableText
                  value={analysis.description ?? ""}
                  placeholder="Click to add a description…"
                  onSave={(v) => save({ description: v })}
                  multiline
                />
              </div>

              {/* Summary */}
              <div>
                <div style={fieldLabel}>Summary</div>
                <EditableText
                  value={analysis.summary ?? ""}
                  placeholder="Click to add a summary…"
                  onSave={(v) => save({ summary: v })}
                  multiline
                />
              </div>

              {/* Characters */}
              {analysis.character_profiles && Object.keys(analysis.character_profiles).length > 0 && (
                <div>
                  <div style={sectionLabel}>Characters</div>
                  <div
                    style={{
                      border: "1px solid var(--rule)",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                    }}
                  >
                    {Object.entries(analysis.character_profiles).map(([name, profile], idx, arr) => {
                      const expanded = expandedChars.has(name);
                      return (
                        <div
                          key={name}
                          style={{ borderBottom: idx < arr.length - 1 ? "1px solid var(--rule)" : "none" }}
                        >
                          <button
                            onClick={() => toggleChar(name)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 10,
                              padding: "10px 12px", background: "none", border: "none",
                              cursor: "pointer", textAlign: "left",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                                textTransform: "uppercase", letterSpacing: 1, color: "var(--ink)", flex: 1,
                              }}
                            >
                              {name}
                            </span>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-faint)" }}>
                              {profile.gender} · {AGE_RANGE_LABELS[profile.age_range] ?? profile.age_range}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                                transition: "transform 0.15s",
                                color: "var(--ink-faint)",
                              }}
                            >
                              <Chev size={11} color="currentColor" />
                            </span>
                          </button>

                          {expanded && (
                            <div
                              style={{
                                padding: "0 12px 12px", display: "flex", flexDirection: "column",
                                gap: 10, background: "var(--accent-faint)",
                              }}
                            >
                              <div style={{ display: "flex", gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={fieldLabel}>Gender</div>
                                  <select
                                    value={profile.gender}
                                    onChange={(e) => saveCharProfile(name, "gender", e.target.value)}
                                    style={{ ...selectStyle, fontSize: 12, padding: "4px 6px" }}
                                  >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="neutral">Neutral</option>
                                  </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={fieldLabel}>Age</div>
                                  <select
                                    value={profile.age_range}
                                    onChange={(e) => saveCharProfile(name, "age_range", e.target.value)}
                                    style={{ ...selectStyle, fontSize: 12, padding: "4px 6px" }}
                                  >
                                    {Object.entries(AGE_RANGE_LABELS).map(([v, l]) => (
                                      <option key={v} value={v}>{l}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <div style={fieldLabel}>Description</div>
                                <EditableText
                                  value={profile.description}
                                  placeholder="Add a character description…"
                                  onSave={(v) => saveCharProfile(name, "description", v)}
                                  multiline
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI disclaimer */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 10px",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--rule)",
                }}
              >
                <Sparkle size={11} color="var(--ink-faint)" />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.4 }}>
                  Generated by AI · May not be accurate
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
