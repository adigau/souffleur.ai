"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { X, Book, Mic, Chev, User } from "@/components/ui/Icons";
import ThemeToggle from "@/components/layout/ThemeToggle";
import CastPanel from "./CastPanel";
import { PlayRolesProvider, usePlayRoles } from "@/contexts/PlayRolesContext";

interface PlayRef {
  id: string;
  title: string;
}

interface PlayShellProps {
  children: React.ReactNode;
  playTitle: string;
  userPlayId: string;
  activeTab: "read" | "practice";
  allPlays?: PlayRef[];
  characters?: string[];
  currentRoles?: string[];
  charStats?: Record<string, { lines: number; words: number }>;
}

export default function PlayShell(props: PlayShellProps) {
  return (
    <PlayRolesProvider initialRoles={props.currentRoles ?? []}>
      <PlayShellInner {...props} />
    </PlayRolesProvider>
  );
}

function PlayShellInner({
  children,
  playTitle,
  userPlayId,
  activeTab,
  allPlays = [],
  characters = [],
  currentRoles = [],
  charStats = {},
}: PlayShellProps) {
  const { roles } = usePlayRoles();
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
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
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--bg)",
        color: "var(--ink)",
        overflow: "hidden",
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
              {playTitle}
            </span>
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
                Switch play
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
                      current
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
          {tab("read", <Book size={13} color="currentColor" />, "Read")}
          {tab("practice", <Mic size={13} color="currentColor" />, "Practice")}
        </div>

        {/* Right: cast + theme */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setCastOpen(true)}
            title="Cast & your role"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              border: roles.length > 0 ? "1px solid var(--accent)" : "1px solid var(--rule)",
              background: roles.length > 0 ? "color-mix(in oklch, var(--accent) 10%, var(--surface))" : "transparent",
              cursor: "pointer",
              color: roles.length > 0 ? "var(--accent)" : "var(--ink-muted)",
            }}
          >
            <User size={14} color="currentColor" />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {children}
      </div>

      {/* Cast panel overlay */}
      {castOpen && (
        <CastPanel
          userPlayId={userPlayId}
          characters={characters}
          charStats={charStats}
          onClose={() => setCastOpen(false)}
        />
      )}
    </div>
  );
}
