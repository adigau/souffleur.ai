"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { X, Book, Mic, Chev, Pencil, Sparkle, Chat, FileText } from "@/components/ui/Icons";
import ThemeToggle from "@/components/layout/ThemeToggle";
import PlayDetailsPanel, { type PlayAnalysis } from "./PlayDetailsPanel";
import PlayChatPanel from "./PlayChatPanel";
import PlayPdfPanel from "./PlayPdfPanel";
import { PlayRolesProvider, usePlayRoles } from "@/contexts/PlayRolesContext";
import { SceneNavProvider, useSceneNav } from "@/contexts/SceneNavContext";
import { CoachProvider } from "@/contexts/CoachContext";
import { createClient } from "@/lib/supabase/client";

const CONFETTI_DOTS = [
  { color: "#ef4444", tx: "0px",   ty: "-30px"  },
  { color: "#f97316", tx: "21px",  ty: "-21px"  },
  { color: "#eab308", tx: "30px",  ty: "0px"    },
  { color: "#22c55e", tx: "21px",  ty: "21px"   },
  { color: "#06b6d4", tx: "0px",   ty: "30px"   },
  { color: "#6366f1", tx: "-21px", ty: "21px"   },
  { color: "#a855f7", tx: "-30px", ty: "0px"    },
  { color: "#ec4899", tx: "-21px", ty: "-21px"  },
];

interface PlayRef {
  id: string;
  title: string;
}

interface PlayShellProps {
  children: React.ReactNode;
  playTitle: string;
  playAuthor?: string | null;
  userPlayId: string;
  activeTab: "read" | "practice";
  canEdit?: boolean;
  allPlays?: PlayRef[];
  characters?: string[];
  currentRoles?: string[];
  charStats?: Record<string, { lines: number; words: number; scenes: { id: string; label: string; lines: number; words: number }[] }>;
  adjacency?: Record<string, Record<string, number>>;
  analysisState?: "ready" | "processing" | "attention";
  scriptType?: string | null;
  playType?: string | null;
  detectedLanguage?: string | null;
  initialAnalysis?: PlayAnalysis | null;
  initialDetailsOpen?: boolean;
}

export default function PlayShell(props: PlayShellProps) {
  return (
    <PlayRolesProvider initialRoles={props.currentRoles ?? []}>
      <SceneNavProvider>
        <PlayShellInner {...props} />
      </SceneNavProvider>
    </PlayRolesProvider>
  );
}

function PlayShellInner({
  children,
  playTitle,
  playAuthor,
  userPlayId,
  activeTab,
  canEdit = false,
  allPlays = [],
  characters = [],
  charStats = {},
  adjacency = {},
  analysisState,
  scriptType,
  playType,
  detectedLanguage,
  initialAnalysis,
  initialDetailsOpen = false,
}: PlayShellProps) {
  const { roles } = usePlayRoles();
  const { currentReadSceneTitle, currentReadSceneId } = useSceneNav();
  const t     = useTranslations("play");
  const tMeta = useTranslations("meta");
  const locale = useLocale();
  const router = useRouter();
  const prefix = locale === "fr" ? "/fr" : "";

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(initialDetailsOpen);
  const [chatOpen, setChatOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [showRainbow, setShowRainbow] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const prevAnalysisStateRef = useRef(analysisState);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const printingRef = useRef(false);

  // Viewing the play in read/practice mode means the import-done overlay is no longer relevant.
  // Dismiss it in sessionStorage so it won't reappear if the user subsequently visits the edit page.
  useEffect(() => {
    try {
      const key = `souffleur-import-done-${userPlayId}`;
      if (sessionStorage.getItem(key) === "done") {
        sessionStorage.setItem(key, "dismissed");
        sessionStorage.removeItem(key + "-stats");
      }
    } catch { /* ignore */ }
  }, [userPlayId]);

  // Close switcher on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Ctrl+P / Cmd+P → print via the dedicated print-view iframe
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!((e.ctrlKey || e.metaKey) && e.key === "p")) return;
      const frame = printFrameRef.current;
      if (!frame || printingRef.current) return;
      e.preventDefault();
      printingRef.current = true;
      const params = new URLSearchParams();
      if (currentReadSceneId) params.set("scene", currentReadSceneId);
      frame.onload = () => {
        frame.contentWindow?.print();
        printingRef.current = false;
        frame.onload = null;
      };
      frame.src = `/api/plays/${userPlayId}/print-view?${params}`;
    }
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [userPlayId, currentReadSceneId]);

  // Refresh server data when analysis completes
  useEffect(() => {
    if (analysisState !== "processing") return;
    const supabase = createClient();
    const channel = supabase
      .channel(`play-analysis-${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_plays", filter: `id=eq.${userPlayId}` },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime payload has no generated types
          if ((payload.new as any).state === "ready") router.refresh();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [analysisState, userPlayId, router]);

  // Celebrate when analysis transitions from processing → ready
  useEffect(() => {
    const prev = prevAnalysisStateRef.current;
    prevAnalysisStateRef.current = analysisState;
    if (prev !== "processing" || analysisState !== "ready") return;
    setShowRainbow(true);
    setShowConfetti(true);
    const t1 = setTimeout(() => setShowConfetti(false), 1100);
    const t2 = setTimeout(() => setShowRainbow(false), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [analysisState]);

  const tab = (id: "read" | "practice", icon: React.ReactNode, label: string) => {
    const active = activeTab === id;
    return (
      <Link
        href={`${prefix}/app/plays/${userPlayId}${id === "read" ? "" : `?tab=${id}`}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: "var(--radius-md)",
          background: active ? "var(--ink)" : "transparent",
          color: active ? "var(--bg)" : "var(--ink-muted)",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "var(--font-body)",
          textDecoration: "none",
          transition: "background 0.15s",
        }}
      >
        {icon}
        {label}
      </Link>
    );
  };

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
      {/* Top bar */}
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
        {/* Left: back + play title switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }} ref={switcherRef}>
          <Link
            href={`${prefix}/app`}
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
          </Link>

          {/* Play title — click to switch */}
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: allPlays.length > 1 ? "pointer" : "default",
              padding: "4px 6px",
              borderRadius: "var(--radius-md)",
              minWidth: 0,
              flex: 1,
            }}
          >
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
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
                  textAlign: "left",
                }}
              >
                {playTitle}
              </span>
              {(playAuthor || scriptType || playType || detectedLanguage) && (
                <span style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "var(--ink-faint)",
                  textAlign: "left",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {[
                    playAuthor ?? null,
                    /* eslint-disable @typescript-eslint/no-explicit-any -- dynamic keys from DB values */
                    scriptType       ? tMeta(`scriptType.${scriptType}` as any)    : null,
                    playType         ? tMeta(`category.${playType}` as any)         : null,
                    detectedLanguage ? tMeta(`language.${detectedLanguage}` as any) : null,
                    /* eslint-enable @typescript-eslint/no-explicit-any */
                  ].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            {allPlays.length > 1 && (
              <Chev
                size={12}
                color="var(--ink-faint)"
              />
            )}
          </button>

          {/* Switcher dropdown */}
          {switcherOpen && allPlays.length > 1 && (
            <div
              style={{
                position: "absolute",
                top: 52,
                left: 16,
                minWidth: 260,
                background: "var(--bg-elev)",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-lg)",
                zIndex: 100,
                overflow: "hidden",
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
                {t("toolbar.switchPlay")}
              </div>
              {allPlays.map((p) => (
                <Link
                  key={p.id}
                  href={`${prefix}/app/plays/${p.id}`}
                  onClick={() => setSwitcherOpen(false)}
                  style={{
                    display: "block",
                    padding: "11px 16px",
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    fontStyle: p.id === userPlayId ? "italic" : "normal",
                    fontWeight: p.id === userPlayId ? 500 : 400,
                    color: p.id === userPlayId ? "var(--accent)" : "var(--ink)",
                    textDecoration: "none",
                    borderBottom: "1px solid var(--rule)",
                  }}
                >
                  {p.title}
                  {p.id === userPlayId && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, marginLeft: 8, color: "var(--ink-faint)" }}>
                      {t("toolbar.currentBadge")}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Center: tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: 3,
            background: "var(--line)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--rule)",
            flexShrink: 0,
          }}
        >
          {tab("read", <Book size={13} color="currentColor" />, t("tabs.read"))}
          {tab("practice", <Mic size={13} color="currentColor" />, t("tabs.practice"))}
        </div>

        {canEdit && (
          <a
            href={`${prefix}/app/plays/${userPlayId}/edit${currentReadSceneTitle ? `?section=${encodeURIComponent(currentReadSceneTitle)}` : ""}`}
            title={t("toolbar.editScript")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--rule)",
              background: "transparent",
              color: "var(--ink-muted)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Pencil size={13} color="currentColor" />
          </a>
        )}

        {/* Right: chat + pdf + details + theme */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {activeTab === "read" && (
            <button
              onClick={() => setChatOpen((v) => !v)}
              title={t("toolbar.coach")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                border: chatOpen ? "1px solid var(--accent)" : "1px solid var(--rule)",
                background: chatOpen ? "color-mix(in oklch, var(--accent) 10%, var(--surface))" : "transparent",
                cursor: "pointer",
                color: chatOpen ? "var(--accent)" : "var(--ink-muted)",
              }}
            >
              <Chat size={14} color="currentColor" />
            </button>
          )}
          <button
            onClick={() => setPdfOpen((v) => !v)}
            title={t("toolbar.exportPdf")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              border: pdfOpen ? "1px solid var(--accent)" : "1px solid var(--rule)",
              background: pdfOpen ? "color-mix(in oklch, var(--accent) 10%, var(--surface))" : "transparent",
              cursor: "pointer",
              color: pdfOpen ? "var(--accent)" : "var(--ink-muted)",
            }}
          >
            <FileText size={14} color="currentColor" />
          </button>
          <div style={{ position: "relative" }}>
            {showConfetti && CONFETTI_DOTS.map((dot, i) => (
              <span
                key={i}
                className="souffleur-confetti-dot"
                style={{
                  top: "50%",
                  left: "50%",
                  background: dot.color,
                  "--tx": dot.tx,
                  "--ty": dot.ty,
                  animationDelay: `${i * 25}ms`,
                } as React.CSSProperties}
              />
            ))}
            <button
              onClick={() => setDetailsOpen(true)}
              title={analysisState === "processing" ? t("toolbar.analysing") : t("toolbar.details")}
              className={
                analysisState === "processing" ? "souffleur-sparkle-processing" :
                showRainbow ? "souffleur-rainbow-glow" : undefined
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                border: showRainbow ? "1px solid currentColor" :
                  analysisState === "processing"
                    ? "1px solid var(--accent)"
                    : roles.length > 0 ? "1px solid var(--accent)" : "1px solid var(--rule)",
                background: showRainbow ? "transparent" :
                  analysisState === "processing"
                    ? "var(--accent-soft)"
                    : roles.length > 0 ? "color-mix(in oklch, var(--accent) 10%, var(--surface))" : "transparent",
                cursor: "pointer",
                color: showRainbow ? undefined :
                  (analysisState === "processing" || roles.length > 0) ? "var(--accent)" : "var(--ink-muted)",
              }}
            >
              <Sparkle size={14} color="currentColor" />
            </button>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <CoachProvider openCoach={() => setChatOpen(true)}>
          {children}
        </CoachProvider>
        {chatOpen && activeTab === "read" && (
          <PlayChatPanel
            userPlayId={userPlayId}
            currentSceneTitle={currentReadSceneTitle}
            userRoles={roles}
            language={detectedLanguage ?? null}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {/* Unified play details panel */}
      {detailsOpen && (
        <PlayDetailsPanel
          userPlayId={userPlayId}
          characters={characters}
          charStats={charStats}
          adjacency={adjacency}
          initialAnalysis={initialAnalysis ?? null}
          initialAnalysisState={analysisState}
          onClose={() => setDetailsOpen(false)}
        />
      )}

      {/* PDF export panel */}
      {pdfOpen && (
        <PlayPdfPanel
          userPlayId={userPlayId}
          playTitle={playTitle}
          userRoles={roles}
          onClose={() => setPdfOpen(false)}
        />
      )}

      {/* Hidden iframe for Ctrl+P print-view — loaded on demand */}
      <iframe
        ref={printFrameRef}
        title="print-view"
        style={{ position: "fixed", left: -9999, top: -9999, width: 1, height: 1, border: "none", opacity: 0 }}
        aria-hidden="true"
      />
    </div>
  );
}
