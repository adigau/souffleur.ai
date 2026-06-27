"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, FileText, Check } from "@/components/ui/Icons";
import { useSceneNav } from "@/contexts/SceneNavContext";

interface PlayPdfPanelProps {
  userPlayId: string;
  playTitle: string;
  userRoles: string[];
  mySceneIds?: string[];
  onClose: () => void;
}

type Scope = "scene" | "play" | "my-scenes";
type Status = "idle" | "done";

export default function PlayPdfPanel({ userPlayId, playTitle: _playTitle, userRoles, mySceneIds = [], onClose }: PlayPdfPanelProps) {
  const t = useTranslations("play");
  const { currentReadSceneId } = useSceneNav();

  const [scope, setScope]         = useState<Scope>(currentReadSceneId ? "scene" : "play");
  const [highlight, setHighlight] = useState(true);
  const [cueMode, setCueMode]     = useState(false);
  const [status, setStatus]       = useState<Status>("idle");

  const hasRoles = userRoles.length > 0;

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function buildPrintUrl() {
    const params = new URLSearchParams();
    if (scope === "scene" && currentReadSceneId) params.set("scene", currentReadSceneId);
    if (scope === "my-scenes") params.set("scenes", mySceneIds.join(","));
    if (!highlight) params.set("highlight", "false");
    if (cueMode && hasRoles) params.set("cue", "true");
    return `/api/plays/${userPlayId}/print-view?${params}`;
  }

  function handleOpen() {
    window.open(buildPrintUrl(), "_blank", "noopener");
    setStatus("done");
  }

  const scopeCanScene = !!currentReadSceneId;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(10, 8, 6, 0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("pdf.title")}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: 400,
          maxWidth: "calc(100vw - 32px)",
          background: "var(--bg-elev)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.38)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 14px",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={14} color="var(--accent)" />
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
              {t("pdf.title")}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, border: "none", background: "none",
              cursor: "pointer", color: "var(--ink-faint)", borderRadius: "var(--radius-md)",
            }}
          >
            <X size={13} color="currentColor" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>

          {/* ── Scope ── */}
          <OptionGroup label={t("pdf.scopeLabel")}>
            <RadioRow
              checked={scope === "play"}
              disabled={false}
              onClick={() => setScope("play")}
              label={t("pdf.scopePlay")}
              desc={t("pdf.scopePlayDesc")}
            />
            <RadioRow
              checked={scope === "scene"}
              disabled={!scopeCanScene}
              onClick={() => scopeCanScene && setScope("scene")}
              label={t("pdf.scopeScene")}
              desc={scopeCanScene ? t("pdf.scopeSceneDesc") : t("pdf.scopeSceneNone")}
              dimmed={!scopeCanScene}
            />
            <RadioRow
              checked={scope === "my-scenes"}
              disabled={mySceneIds.length === 0}
              onClick={() => mySceneIds.length > 0 && setScope("my-scenes")}
              label={t("pdf.scopeMyScenes")}
              desc={mySceneIds.length > 0
                ? t("pdf.scopeMyScenesDesc", { count: mySceneIds.length })
                : t("pdf.scopeMyScenesNone")}
              dimmed={mySceneIds.length === 0}
            />
          </OptionGroup>

          {/* ── Character options ── */}
          {hasRoles && (
            <OptionGroup label={t("pdf.rolesLabel", { roles: userRoles.join(", ") })} style={{ marginTop: 16 }}>
              <CheckRow
                checked={highlight}
                disabled={false}
                onClick={() => { setHighlight((v) => !v); if (!highlight) setCueMode(false); }}
                label={t("pdf.highlight")}
                desc={t("pdf.highlightDesc")}
              />
              <CheckRow
                checked={cueMode}
                disabled={!highlight}
                onClick={() => highlight && setCueMode((v) => !v)}
                label={t("pdf.cueMode")}
                desc={t("pdf.cueModeDesc")}
                dimmed={!highlight}
              />
            </OptionGroup>
          )}

          {/* ── Actions ── */}
          <div style={{ marginTop: 20 }}>
            {status === "idle" && (
              <button
                onClick={handleOpen}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: 0.2,
                }}
              >
                {t("pdf.generate")}
              </button>
            )}

            {status === "done" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "color-mix(in oklch, var(--moss) 15%, var(--bg))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={11} color="var(--moss)" />
                  </div>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                    {t("pdf.done")}
                  </span>
                </div>
                <p style={{ margin: "0 0 14px", fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ink-muted)", lineHeight: 1.5 }}>
                  {t("pdf.doneDesc")}
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button
                    onClick={handleOpen}
                    style={{
                      padding: "7px 16px",
                      border: "1px solid var(--rule)",
                      background: "transparent",
                      borderRadius: "var(--radius-md)",
                      fontFamily: "var(--font-body)",
                      fontSize: 12,
                      color: "var(--ink-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {t("pdf.downloadAgain")}
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      padding: "7px 16px",
                      background: "var(--ink)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      fontFamily: "var(--font-body)",
                      fontSize: 12,
                      color: "var(--bg)",
                      cursor: "pointer",
                    }}
                  >
                    {t("pdf.close")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Small sub-components ────────────────────────────────────────────────────────

function OptionGroup({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <p style={{
        margin: "0 0 8px",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        color: "var(--ink-faint)",
      }}>
        {label}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {children}
      </div>
    </div>
  );
}

function RadioRow({
  checked, disabled, onClick, label, desc, dimmed,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
  dimmed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "9px 10px",
        border: checked ? "1px solid color-mix(in oklch, var(--accent) 35%, var(--bg))" : "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        background: checked ? "color-mix(in oklch, var(--accent) 6%, var(--bg))" : "transparent",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {/* Radio ring */}
      <div style={{
        flexShrink: 0,
        width: 14,
        height: 14,
        marginTop: 1,
        borderRadius: "50%",
        border: checked ? "4px solid var(--accent)" : "1.5px solid var(--ink-faint)",
        background: checked ? "var(--accent)" : "transparent",
        transition: "border 0.12s",
      }} />
      <div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 500, color: "var(--ink)", lineHeight: 1.3 }}>
          {label}
        </div>
        {desc && (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-muted)", marginTop: 2, lineHeight: 1.4 }}>
            {desc}
          </div>
        )}
      </div>
    </button>
  );
}

function CheckRow({
  checked, disabled, onClick, label, desc, dimmed,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
  dimmed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "9px 10px",
        border: checked ? "1px solid color-mix(in oklch, var(--accent) 35%, var(--bg))" : "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        background: checked ? "color-mix(in oklch, var(--accent) 6%, var(--bg))" : "transparent",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {/* Checkbox */}
      <div style={{
        flexShrink: 0,
        width: 14,
        height: 14,
        marginTop: 1,
        borderRadius: 3,
        border: checked ? "none" : "1.5px solid var(--ink-faint)",
        background: checked ? "var(--accent)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.12s",
      }}>
        {checked && <Check size={9} color="#fff" />}
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 500, color: "var(--ink)", lineHeight: 1.3 }}>
          {label}
        </div>
        {desc && (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-muted)", marginTop: 2, lineHeight: 1.4 }}>
            {desc}
          </div>
        )}
      </div>
    </button>
  );
}

