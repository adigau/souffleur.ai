"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { X, Book, Mic, Chev, Pencil, Sparkle, Chat } from "@/components/ui/Icons";
import ThemeToggle from "@/components/layout/ThemeToggle";
import PlayDetailsPanel, { type PlayAnalysis } from "./PlayDetailsPanel";
import PlayChatPanel from "./PlayChatPanel";
import { PlayRolesProvider, usePlayRoles } from "@/contexts/PlayRolesContext";
import { SceneNavProvider, useSceneNav } from "@/contexts/SceneNavContext";
import { createClient } from "@/lib/supabase/client";

function langDisplayName(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

interface PlayRef {
  id: string;
  title: string;
}

interface PlayShellProps {
  children: React.ReactNode;
  playTitle: string;
  userPlayId: string;
  activeTab: "read" | "practice";
  canEdit?: boolean;
  allPlays?: PlayRef[];
  characters?: string[];
  currentRoles?: string[];
  charStats?: Record<string, { lines: number; words: number; scenes: { id: string; label: string; lines: number; words: number }[] }>;
  adjacency?: Record<string, Record<string, number>>;
  analysisState?: "ready" | "processing" | "attention";
  playType?: string | null;
  detectedLanguage?: string | null;
  initialAnalysis?: PlayAnalysis | null;
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
  userPlayId,
  activeTab,
  canEdit = false,
  allPlays = [],
  characters = [],
  currentRoles = [],
  charStats = {},
  adjacency = {},
  analysisState,
  playType,
  detectedLanguage,
  initialAnalysis,
}: PlayShellProps) {
  const { roles } = usePlayRoles();
  const { currentReadSceneTitle } = useSceneNav();
  const t = useTranslations("play");
  const locale = useLocale();
  const router = useRouter();
  const prefix = locale === "fr" ? "/fr" : "";

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

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
          if ((payload.new as any).state === "ready") router.refresh();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [analysisState, userPlayId, router]);

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
              {(playType || detectedLanguage) && (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-faint)",
                  textAlign: "left",
                  letterSpacing: 0.3,
                }}>
                  {[
                    playType ? playType.charAt(0).toUpperCase() + playType.slice(1) : null,
                    detectedLanguage ? langDisplayName(detectedLanguage) : null,
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

        {/* Right: chat + details + theme */}
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
            onClick={() => setDetailsOpen(true)}
            title={analysisState === "processing" ? t("toolbar.analysing") : t("toolbar.details")}
            className={analysisState === "processing" ? "souffleur-sparkle-processing" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              border: analysisState === "processing"
                ? "1px solid var(--accent)"
                : roles.length > 0 ? "1px solid var(--accent)" : "1px solid var(--rule)",
              background: analysisState === "processing"
                ? "var(--accent-soft)"
                : roles.length > 0 ? "color-mix(in oklch, var(--accent) 10%, var(--surface))" : "transparent",
              cursor: "pointer",
              color: (analysisState === "processing" || roles.length > 0) ? "var(--accent)" : "var(--ink-muted)",
            }}
          >
            <Sparkle size={14} color="currentColor" />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {children}
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
    </div>
  );
}
