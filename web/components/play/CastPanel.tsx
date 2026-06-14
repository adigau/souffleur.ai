"use client";

import { useEffect, useTransition, useState } from "react";
import { X } from "@/components/ui/Icons";
import { toggleUserPlayRole } from "@/lib/actions/plays";
import { usePlayRoles } from "@/contexts/PlayRolesContext";

interface CastMember {
  role: string;
  display_name: string;
  email: string;
  is_you: boolean;
}

interface CharStat {
  lines: number;
  words: number;
}

interface CastPanelProps {
  userPlayId: string;
  characters: string[];
  charStats?: Record<string, CharStat>;
  onClose: () => void;
}

// Small letter avatar
function Avatar({ name, email }: { name: string; email: string }) {
  const letter = (name || email || "?")[0].toUpperCase();
  return (
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
  );
}

// Hover tooltip showing avatar + name + email
function PlayerTooltip({ name, email }: { name: string; email: string }) {
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
      <Avatar name={name} email={email} />
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
  onClose,
}: CastPanelProps) {
  const { roles, setRoles } = usePlayRoles();
  const [cast, setCast] = useState<CastMember[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

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

  // Only entries from OTHER users (is_you: false from the DB).
  // The current user's assignment is driven entirely by local `roles` state —
  // never by the API — so stale DB entries don't bleed through as "another player".
  const otherPlayers = new Map<string, { displayName: string; email: string }>();
  for (const m of cast) {
    if (!m.is_you) {
      otherPlayers.set(m.role, { displayName: m.display_name, email: m.email });
    }
  }

  // Dot indicator on character pills: taken by someone else AND not selected by you
  const takenByOther = new Set(
    cast.filter((m) => !m.is_you).map((m) => m.role)
  );

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

          {/* Your characters */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--ink-faint)", marginBottom: 12 }}>
              Your characters
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {characters.map((ch) => {
                const isSelected = roles.includes(ch);
                const taken = takenByOther.has(ch);
                return (
                  <button
                    key={ch}
                    onClick={() => toggleRole(ch)}
                    disabled={isPending}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 999,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--rule)"}`,
                      background: isSelected
                        ? "color-mix(in oklch, var(--accent) 12%, var(--surface))"
                        : "var(--surface)",
                      color: isSelected ? "var(--accent)" : taken ? "var(--ink-faint)" : "var(--ink)",
                      opacity: isPending ? 0.6 : 1,
                      position: "relative",
                    }}
                  >
                    {ch}
                    {taken && !isSelected && (
                      <span
                        style={{
                          position: "absolute",
                          top: -4,
                          right: -4,
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "var(--ink-faint)",
                          border: "1.5px solid var(--bg-elev)",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {roles.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>
                Playing as{" "}
                <strong style={{ color: "var(--accent)" }}>{roles.join(", ")}</strong>
                {" "}— your lines are highlighted in the script.
              </div>
            )}
          </div>

          {/* Cast + stats */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--ink-faint)", marginBottom: 12 }}>
              The cast so far
            </div>

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
              <span style={{ textAlign: "right" }}>Played by</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {characters.map((ch) => {
                const isYou = roles.includes(ch);
                const other = otherPlayers.get(ch);
                const stat = charStats[ch];

                return (
                  <div
                    key={ch}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      gap: "0 12px",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: isYou
                        ? "color-mix(in oklch, var(--accent) 8%, var(--surface))"
                        : "var(--surface)",
                      border: `1px solid ${isYou ? "var(--accent)" : "var(--rule)"}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: isYou ? "var(--accent)" : "var(--ink)",
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      {ch}
                    </span>

                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", textAlign: "right" }}>
                      {stat?.lines ?? "—"}
                    </span>

                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", textAlign: "right" }}>
                      {stat?.words ?? "—"}
                    </span>

                    {/* Played by — hover shows tooltip for other players */}
                    <div
                      style={{ position: "relative", textAlign: "right" }}
                      onMouseEnter={() => other ? setHoveredRole(ch) : undefined}
                      onMouseLeave={() => setHoveredRole(null)}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: isYou ? "var(--accent)" : other ? "var(--ink-muted)" : "var(--ink-faint)",
                          fontStyle: !isYou && !other ? "italic" : "normal",
                          cursor: other ? "default" : "default",
                          borderBottom: other ? "1px dashed var(--rule)" : "none",
                        }}
                      >
                        {isYou ? "you" : other ? other.displayName : "—"}
                      </span>

                      {hoveredRole === ch && other && (
                        <PlayerTooltip name={other.displayName} email={other.email} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
