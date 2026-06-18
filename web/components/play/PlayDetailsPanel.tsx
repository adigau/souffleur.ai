"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sparkle, X, Chev, Check, Pencil } from "@/components/ui/Icons";
import { toggleUserPlayRole } from "@/lib/actions/plays";
import { usePlayRoles } from "@/contexts/PlayRolesContext";
import { useSceneNav } from "@/contexts/SceneNavContext";

interface ConfidenceOption {
  value: string;
  confidence: number;
}

interface CharacterProfile {
  gender: "male" | "female" | "neutral";
  age_range: "child" | "teen" | "young_adult" | "adult" | "elderly";
  description: string;
  has_dialogue?: boolean;
}

export interface PlayAnalysis {
  description: string | null;
  summary: string | null;
  play_type: string | null;
  play_type_options: ConfidenceOption[] | null;
  detected_language: string | null;
  detected_language_options: ConfidenceOption[] | null;
  character_profiles: Record<string, CharacterProfile> | null;
  updated_at: string | null;
}

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

const AGE_RANGE_LABELS: Record<string, string> = {
  child: "child", teen: "teen", young_adult: "young adult", adult: "adult", elderly: "elderly",
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "neutral", label: "Neutral / Unknown" },
];

const AGE_RANGE_OPTIONS = [
  { value: "child", label: "Child" },
  { value: "teen", label: "Teen" },
  { value: "young_adult", label: "Young adult" },
  { value: "adult", label: "Adult" },
  { value: "elderly", label: "Elderly" },
];

const PLAY_TYPES = [
  "tragedy", "comedy", "tragicomedy", "drama",
  "farce", "musical", "melodrama", "historical", "thriller", "other",
];

function ShimmerLine({ width = "100%", height = 12 }: { width?: number | string; height?: number }) {
  return <div className="souffleur-shimmer" style={{ width, height, borderRadius: 3 }} />;
}

function langDisplay(code: string): string {
  try { return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code; }
  catch { return code; }
}

// Shows a value as text with a subtle pencil icon; clicking pencil opens a select or input
function EditableValue({
  value, options, onSave, display, placeholder, editTitle,
}: {
  value: string;
  options?: { value: string; label: string }[];
  onSave: (v: string) => void;
  display?: (v: string) => string;
  placeholder?: string;
  editTitle?: string;
}) {
  const [editing, setEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setEditing(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editing]);

  const displayText = value
    ? (display ? display(value) : value.charAt(0).toUpperCase() + value.slice(1))
    : (placeholder ?? "—");

  if (editing) {
    const editStyle: React.CSSProperties = {
      width: "100%", background: "var(--surface)", border: "1px solid var(--accent)",
      borderRadius: "var(--radius-sm)", padding: "5px 8px", fontFamily: "var(--font-body)",
      fontSize: 13, color: "var(--ink)", outline: "none",
    };
    return (
      <div ref={containerRef}>
        {options ? (
          <select
            autoFocus
            value={value}
            onChange={(e) => { onSave(e.target.value); setEditing(false); }}
            onBlur={() => setEditing(false)}
            style={editStyle}
          >
            <option value="">—</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            type="text"
            autoFocus
            defaultValue={value}
            onBlur={(e) => { onSave(e.target.value); setEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onSave((e.target as HTMLInputElement).value); setEditing(false); }
              if (e.key === "Escape") setEditing(false);
            }}
            style={{ ...editStyle, display: "block" }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, paddingTop: 2 }}>
      <span style={{
        fontFamily: "var(--font-body)", fontSize: 14,
        color: value ? "var(--ink)" : "var(--ink-faint)",
        fontWeight: value ? 500 : 400,
      }}>
        {displayText}
      </span>
      <button
        onClick={() => setEditing(true)}
        title={editTitle}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--ink-faint)", padding: 2, display: "flex", alignItems: "center", opacity: 0.5,
        }}
      >
        <Pencil size={10} color="currentColor" />
      </button>
    </div>
  );
}

// Inline editable multiline text: shows as read text, click opens a textarea
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

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface)", border: "1px solid var(--accent)",
    borderRadius: "var(--radius-sm)", padding: "5px 8px", fontFamily: "var(--font-body)",
    fontSize: 13, color: "var(--ink)", outline: "none", lineHeight: 1.55, resize: "none",
  };

  if (editing) {
    return multiline
      ? <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} rows={3} style={inputStyle} />
      : <input type="text" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} style={{ ...inputStyle, display: "block" }} />;
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.55, cursor: "text",
        color: value ? "var(--ink)" : "var(--ink-faint)",
        padding: "4px 0", borderBottom: "1px dashed var(--rule)", whiteSpace: "pre-wrap",
      }}
    >
      {value || placeholder}
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase",
  letterSpacing: 1, color: "var(--ink-faint)", marginBottom: 3,
};

const miniHeader: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase",
  letterSpacing: 1.2, color: "var(--ink-faint)", marginBottom: 4,
};

export default function PlayDetailsPanel({
  userPlayId,
  characters = [],
  charStats = {},
  adjacency = {},
  initialAnalysis = null,
  initialAnalysisState,
  onClose,
}: {
  userPlayId: string;
  characters?: string[];
  charStats?: Record<string, CharStat>;
  adjacency?: Record<string, Record<string, number>>;
  initialAnalysis?: PlayAnalysis | null;
  initialAnalysisState?: "ready" | "processing" | "attention";
  onClose: () => void;
}) {
  const t = useTranslations("play");
  const uiLocale = useLocale();
  const { roles, setRoles } = usePlayRoles();
  const { requestSceneJump } = useSceneNav();
  const [analysis, setAnalysis] = useState<PlayAnalysis | null>(initialAnalysis);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [expandedChars, setExpandedChars] = useState<Set<string>>(new Set());
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [regenSet, setRegenSet] = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isProcessing = initialAnalysisState === "processing" && analysis === null;

  useEffect(() => {
    fetch(`/api/plays/${userPlayId}/cast`)
      .then((r) => r.json())
      .then((d) => setCast(d.cast ?? []))
      .catch(() => {});
  }, [userPlayId]);

  const fetchAnalysis = useCallback(async (): Promise<boolean> => {
    try {
      const r = await fetch(`/api/plays/${userPlayId}/analysis`);
      const d = await r.json();
      if (d.analysis) { setAnalysis(d.analysis); return true; }
      return false;
    } catch { return false; }
  }, [userPlayId]);

  useEffect(() => {
    if (initialAnalysis) return;
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
  }, [fetchAnalysis, initialAnalysis]);

  const save = useCallback((patch: Partial<PlayAnalysis>) => {
    setAnalysis((prev) => prev ? { ...prev, ...patch } : prev);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/plays/${userPlayId}/analysis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(console.error);
    }, 400);
  }, [userPlayId]);

  function saveCharProfile(name: string, field: keyof CharacterProfile, value: string) {
    setAnalysis((prev) => {
      if (!prev) return prev;
      const profiles = { ...(prev.character_profiles ?? {}) };
      const existingKey = Object.keys(profiles).find((k) => k.toLowerCase() === name.toLowerCase()) ?? name;
      profiles[existingKey] = {
        ...(profiles[existingKey] ?? { gender: "neutral", age_range: "adult", description: "", has_dialogue: true }),
        [field]: value,
      };
      // Debounce the API write with the freshly-computed profiles
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/plays/${userPlayId}/analysis`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ character_profiles: profiles }),
        }).catch(console.error);
      }, 400);
      return { ...prev, character_profiles: profiles };
    });
  }

  async function regenDescription(ch: string, gender: string, age_range: string) {
    setRegenSet((prev) => new Set([...prev, ch]));
    try {
      const res = await fetch(`/api/plays/${userPlayId}/regen-char-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterName: ch, gender, age_range, uiLocale }),
      });
      if (res.ok) {
        const { description } = await res.json();
        saveCharProfile(ch, "description", description);
      }
    } finally {
      setRegenSet((prev) => { const next = new Set(prev); next.delete(ch); return next; });
    }
  }

  function toggleRole(ch: string) {
    const next = roles.includes(ch) ? roles.filter((r) => r !== ch) : [...roles, ch];
    setRoles(next);
    startTransition(async () => { await toggleUserPlayRole(userPlayId, ch); });
  }

  function toggleExpanded(ch: string) {
    setExpandedChars((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch); else next.add(ch);
      return next;
    });
  }

  function buildTypeOptions(opts: ConfidenceOption[] | null) {
    if (opts && opts.length > 0) return opts.map((o) => ({ value: o.value, label: o.value.charAt(0).toUpperCase() + o.value.slice(1) }));
    return PLAY_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
  }

  const COMMON_LANG_CODES = [
    "fr", "en", "de", "es", "it", "pt", "ru", "nl",
    "pl", "sv", "da", "no", "fi", "cs", "hu", "ro",
    "el", "tr", "ar", "ja", "zh", "ko", "la",
  ];

  function buildLangOptions(opts: ConfidenceOption[] | null) {
    const detected = (opts ?? []).map((o) => ({ value: o.value, label: langDisplay(o.value) }));
    const detectedSet = new Set(detected.map((o) => o.value));
    const rest = COMMON_LANG_CODES
      .filter((c) => !detectedSet.has(c))
      .map((c) => ({ value: c, label: langDisplay(c) }));
    return [...detected, ...rest];
  }

  const otherPlayers = new Map<string, { displayName: string; email: string }>();
  for (const m of cast) {
    if (!m.is_you) otherPlayers.set(m.role, { displayName: m.display_name, email: m.email });
  }

  const totalWordsAll = Object.values(charStats).reduce((sum, s) => sum + s.words, 0);

  const sortedCharacters = [...characters].sort((a, b) => {
    const aYou = roles.includes(a) ? 1 : 0;
    const bYou = roles.includes(b) ? 1 : 0;
    if (aYou !== bYou) return bYou - aYou;
    return (charStats[b]?.words ?? 0) - (charStats[a]?.words ?? 0);
  });

  const speakingSetLower = new Set(characters.map((c) => c.toLowerCase()));
  // Case-insensitive: AI may use "Pierre" while the script has "PIERRE".
  const mentionedChars: Array<[string, CharacterProfile]> = analysis?.character_profiles
    ? Object.entries(analysis.character_profiles).filter(
        ([name]) => !speakingSetLower.has(name.toLowerCase())
      )
    : [];

  const profilesLower: Map<string, CharacterProfile> = new Map(
    Object.entries(analysis?.character_profiles ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  function getProfile(name: string): CharacterProfile | undefined {
    return analysis?.character_profiles?.[name] ?? profilesLower.get(name.toLowerCase());
  }

  function withYouCount(ch: string): number {
    return roles.reduce((sum, role) => sum + (adjacency[role]?.[ch] ?? 0), 0);
  }

  const showOverviewSkeleton = !analysis && isProcessing;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.22)" }} />

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 400, zIndex: 50,
        background: "var(--bg-elev)", borderLeft: "1px solid var(--rule)",
        display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)",
      }}>
        {/* Header */}
        <div style={{
          height: 52, flexShrink: 0, display: "flex", alignItems: "center",
          padding: "0 16px", borderBottom: "1px solid var(--rule)", gap: 8,
        }}>
          <Sparkle size={14} color="var(--accent)" />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase",
            letterSpacing: 1.2, color: "var(--ink)", fontWeight: 600, flex: 1,
          }}>
            {t("details.title")}
          </span>
          {isProcessing && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9.5,
              background: "var(--accent-faint)", padding: "2px 7px",
              borderRadius: "var(--radius-sm)", letterSpacing: 0.5,
            }}>
              <span className="souffleur-ai-text-shimmer">{t("details.analysing")}</span>
            </span>
          )}
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-faint)", padding: 4, display: "flex", alignItems: "center",
          }}>
            <X size={13} color="currentColor" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ─── OVERVIEW ─── */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--ink-faint)", marginBottom: 14 }}>
              {t("details.overview")}
            </div>

            {showOverviewSkeleton ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <div style={fieldLabel}>{t("details.type")}</div>
                    <ShimmerLine width={72} height={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={fieldLabel}>{t("details.language")}</div>
                    <ShimmerLine width={80} height={18} />
                  </div>
                </div>
                <div>
                  <div style={fieldLabel}>{t("details.description")}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 4 }}>
                    <ShimmerLine height={12} /><ShimmerLine width="80%" height={12} />
                  </div>
                </div>
                <div>
                  <div style={fieldLabel}>{t("details.summary")}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 4 }}>
                    <ShimmerLine height={12} /><ShimmerLine height={12} /><ShimmerLine width="70%" height={12} />
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 12px",
                  background: "var(--accent-faint)", borderRadius: "var(--radius-md)",
                  border: "1px solid color-mix(in oklch, var(--accent) 20%, var(--rule))",
                }}>
                  <Sparkle size={12} color="var(--accent)" />
                  <span className="souffleur-ai-text-shimmer" style={{ fontFamily: "var(--font-body)", fontSize: 12 }}>
                    {t("details.analysisWaiting")}
                  </span>
                </div>
              </div>
            ) : analysis ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Type + Language as confident text values */}
                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <div style={fieldLabel}>{t("details.type")}</div>
                    <EditableValue
                      value={analysis.play_type ?? ""}
                      options={buildTypeOptions(analysis.play_type_options ?? null)}
                      onSave={(v) => save({ play_type: v })}
                      placeholder={t("details.unknown")}
                      editTitle={t("details.edit")}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={fieldLabel}>{t("details.language")}</div>
                    <EditableValue
                      value={analysis.detected_language ?? ""}
                      options={buildLangOptions(analysis.detected_language_options ?? null)}
                      onSave={(v) => save({ detected_language: v } as any)}
                      display={langDisplay}
                      placeholder={t("details.unknown")}
                      editTitle={t("details.edit")}
                    />
                  </div>
                </div>

                <div>
                  <div style={fieldLabel}>{t("details.description")}</div>
                  <EditableText value={analysis.description ?? ""} placeholder={t("details.addDescription")} onSave={(v) => save({ description: v })} multiline />
                </div>

                <div>
                  <div style={fieldLabel}>{t("details.summary")}</div>
                  <EditableText value={analysis.summary ?? ""} placeholder={t("details.addSummary")} onSave={(v) => save({ summary: v })} multiline />
                </div>
              </div>
            ) : (
              <div style={{
                fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 13,
                color: "var(--ink-faint)", lineHeight: 1.7, padding: "4px 0",
              }}>
                {t("details.noAnalysis")}{" "}
                <span style={{ fontStyle: "normal", fontFamily: "var(--font-body)" }}>
                  {t("details.noAnalysisCta")}
                </span>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: "var(--rule)", margin: "0 -18px" }} />

          {/* ─── CHARACTERS ─── */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--ink-faint)" }}>
                {t("details.characters")}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-faint)" }}>
                {t("details.speakingCount", { count: characters.length })}
              </span>
            </div>

            {characters.length === 0 ? (
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)", padding: "6px 0" }}>
                {t("details.noCharacters")}
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 44px 54px 32px", gap: "0 8px",
                  padding: "0 10px 6px",
                  fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: 1.2, color: "var(--ink-faint)",
                }}>
                  <span>{t("details.colCharacter")}</span>
                  <span style={{ textAlign: "right" }}>{t("details.colLines")}</span>
                  <span style={{ textAlign: "right" }}>{t("details.colWords")}</span>
                  <span style={{ textAlign: "right" }}>{t("details.colYou")}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {sortedCharacters.map((ch) => {
                    const isYou = roles.includes(ch);
                    const other = otherPlayers.get(ch);
                    const stat = charStats[ch];
                    const isOpen = expandedChars.has(ch);
                    const profile = getProfile(ch);
                    const top3 = stat ? [...stat.scenes].sort((a, b) => b.words - a.words).slice(0, 3) : [];
                    const pctOfScript = stat && totalWordsAll > 0 ? Math.round((stat.words / totalWordsAll) * 100) : 0;
                    const avgWordsPerLine = stat && stat.lines > 0 ? (stat.words / stat.lines).toFixed(1) : "—";
                    const sceneCount = stat?.scenes.length ?? 0;
                    const withYou = roles.length > 0 && !isYou ? withYouCount(ch) : 0;
                    const topPartners = Object.entries(adjacency[ch] ?? {})
                      .filter(([p]) => isYou ? !roles.includes(p) : true)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3);

                    return (
                      <div key={ch} style={{
                        borderRadius: "var(--radius-md)",
                        background: isYou ? "color-mix(in oklch, var(--accent) 8%, var(--surface))" : "var(--surface)",
                        border: `1px solid ${isYou ? "var(--accent)" : "var(--rule)"}`,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 44px 54px 32px",
                          gap: "0 8px", alignItems: "center", padding: "9px 10px",
                        }}>
                          {/* Name + AI tag */}
                          <button
                            onClick={() => stat && toggleExpanded(ch)}
                            disabled={!stat}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              background: "none", border: "none", padding: 0,
                              cursor: stat ? "pointer" : "default", minWidth: 0,
                            }}
                          >
                            <span style={{
                              display: "flex", color: "var(--ink-faint)", flexShrink: 0,
                              transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s",
                              opacity: stat ? 1 : 0,
                            }}>
                              <Chev size={9} color="currentColor" />
                            </span>
                            <span style={{
                              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                              color: isYou ? "var(--accent)" : "var(--ink)",
                              textTransform: "uppercase", letterSpacing: 0.8,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {ch}
                            </span>
                          </button>

                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", textAlign: "right" }}>
                            {stat?.lines ?? "—"}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", textAlign: "right" }}>
                            {stat?.words ?? "—"}
                          </span>

                          {/* Role checkbox */}
                          <div
                            style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}
                            onMouseEnter={() => other ? setHoveredRole(ch) : undefined}
                            onMouseLeave={() => setHoveredRole(null)}
                          >
                            {other && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 14, height: 14, borderRadius: 999, background: "var(--ink-faint)",
                                color: "var(--bg-elev)", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, flexShrink: 0,
                              }}>
                                {(other.displayName || other.email || "?")[0].toUpperCase()}
                              </span>
                            )}
                            <button
                              onClick={() => toggleRole(ch)}
                              disabled={isPending}
                              aria-pressed={isYou}
                              title={isYou ? t("details.youRemove") : t("details.markRole")}
                              style={{
                                width: 19, height: 19, flexShrink: 0, padding: 0, borderRadius: 5,
                                border: `1.5px solid ${isYou ? "var(--accent)" : "var(--rule)"}`,
                                background: isYou ? "var(--accent)" : "var(--surface)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", opacity: isPending ? 0.6 : 1,
                                transition: "background 0.12s, border-color 0.12s",
                              }}
                            >
                              {isYou && <Check size={11} color="#fff" />}
                            </button>
                            {hoveredRole === ch && other && (
                              <div style={{
                                position: "absolute", right: 0, bottom: "calc(100% + 8px)",
                                background: "var(--ink)", color: "var(--bg)",
                                borderRadius: "var(--radius-lg)", padding: "8px 10px",
                                display: "flex", alignItems: "center", gap: 8,
                                whiteSpace: "nowrap", zIndex: 10,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.2)", pointerEvents: "none",
                              }}>
                                <span style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  width: 24, height: 24, borderRadius: 999, background: "var(--accent)",
                                  color: "#fff", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, flexShrink: 0,
                                }}>
                                  {(other.displayName || other.email || "?")[0].toUpperCase()}
                                </span>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{other.displayName}</span>
                                  <span style={{ fontSize: 10, opacity: 0.65, fontFamily: "var(--font-mono)" }}>{other.email}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isOpen && stat && (
                          <div style={{ padding: "4px 10px 12px", borderTop: "1px solid var(--rule)", marginTop: -1 }}>
                            <div style={{ display: "flex", gap: 14, padding: "10px 0 4px", flexWrap: "wrap" }}>
                              {[
                                { value: `${pctOfScript}%`, label: t("details.ofScript") },
                                { value: avgWordsPerLine, label: t("details.wordsPerLine") },
                                { value: sceneCount, label: t("details.scenesCount") },
                                ...(withYou > 0 ? [{ value: withYou, label: t("details.linesWith") }] : []),
                              ].map(({ value, label }) => (
                                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{value}</span>
                                  <span style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{label}</span>
                                </div>
                              ))}
                            </div>

                            {profile ? (
                              <>
                                {/* Gender + Age */}
                                <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={miniHeader}>{t("details.profileGender")}</div>
                                    <EditableValue
                                      value={profile.gender ?? ""}
                                      options={GENDER_OPTIONS}
                                      onSave={(v) => {
                                        saveCharProfile(ch, "gender", v);
                                        regenDescription(ch, v, profile.age_range ?? "adult");
                                      }}
                                      display={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                                      editTitle={t("details.edit")}
                                    />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={miniHeader}>{t("details.profileAge")}</div>
                                    <EditableValue
                                      value={profile.age_range ?? ""}
                                      options={AGE_RANGE_OPTIONS}
                                      onSave={(v) => {
                                        saveCharProfile(ch, "age_range", v);
                                        regenDescription(ch, profile.gender ?? "neutral", v);
                                      }}
                                      display={(v) => AGE_RANGE_LABELS[v] ?? v}
                                      editTitle={t("details.edit")}
                                    />
                                  </div>
                                </div>

                                {/* Description */}
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ ...miniHeader, display: "flex", alignItems: "center", gap: 5 }}>
                                    {t("details.profileDesc")}
                                    {regenSet.has(ch) && (
                                      <span className="souffleur-ai-text-shimmer" style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 0.3 }}>
                                        {t("coach.thinking")}
                                      </span>
                                    )}
                                  </div>
                                  {regenSet.has(ch) ? (
                                    <div style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                                      <ShimmerLine height={12} />
                                      <ShimmerLine width="65%" height={12} />
                                    </div>
                                  ) : (
                                    <EditableText
                                      value={profile.description ?? ""}
                                      placeholder={t("details.addCharDesc")}
                                      onSave={(v) => saveCharProfile(ch, "description", v)}
                                      multiline
                                    />
                                  )}
                                </div>
                              </>
                            ) : showOverviewSkeleton ? (
                              <div style={{ marginTop: 10 }}>
                                <div style={miniHeader}>{t("details.profileDesc")}</div>
                                <ShimmerLine height={12} />
                                <div style={{ height: 4 }} />
                                <ShimmerLine width="60%" height={12} />
                              </div>
                            ) : null}

                            {topPartners.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <div style={miniHeader}>{t("details.playsMostWith")}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {topPartners.map(([name, count]) => (
                                    <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 4px" }}>
                                      <span style={{ color: "var(--ink-muted)" }}>{name}</span>
                                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-faint)", marginLeft: 8 }}>{count}×</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {top3.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <div style={miniHeader}>{t("details.topScenes")}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {top3.map((s, i) => (
                                    <button
                                      key={i}
                                      onClick={() => { requestSceneJump(s.id); onClose(); }}
                                      style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        width: "100%", fontSize: 12, background: "transparent", border: "none",
                                        padding: "2px 4px", borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left",
                                      }}
                                    >
                                      <span style={{ color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-faint)", flexShrink: 0, marginLeft: 8 }}>{s.words}w</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Mentioned-only characters from AI */}
                {mentionedChars.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ ...miniHeader, marginBottom: 6 }}>{t("details.alsoMentioned")}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {mentionedChars.map(([name, profile]) => (
                        <div key={name} style={{
                          padding: "8px 10px", background: "var(--surface)",
                          border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", opacity: 0.75,
                        }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--ink)", marginBottom: profile.description ? 3 : 0 }}>
                            {name}
                          </div>
                          {profile.description && (
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.4 }}>
                              {profile.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* AI disclaimer */}
          {analysis && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
              background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--rule)",
            }}>
              <Sparkle size={11} color="var(--ink-faint)" />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.4 }}>
                {t("details.aiDisclaimer")}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
