"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePdfImport } from "@/contexts/PdfImportContext";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEstimate(sec: number): string {
  if (sec < 60) return "< 1 min";
  const lo = Math.max(1, Math.floor(sec / 60));
  return `~${lo}–${lo + 1} min`;
}

export default function PdfImportPreviewModal() {
  const t = useTranslations("library");
  const { pendingImport, clearPendingImport, confirmPendingImport } = usePdfImport();

  // Close on Escape
  useEffect(() => {
    if (!pendingImport) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") clearPendingImport();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingImport, clearPendingImport]);

  if (!pendingImport) return null;

  const { fileName, fileSize, pageCount, estimatedSec } = pendingImport;

  return (
    /* Backdrop */
    <div
      onClick={clearPendingImport}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        backdropFilter: "blur(2px)",
        animation: "souffleur-preview-fade-in 0.18s ease",
      }}
    >
      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
          maxWidth: 460,
          width: "100%",
          overflow: "hidden",
          animation: "souffleur-preview-slide-up 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 0" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              fontStyle: "italic",
              color: "var(--ink)",
              marginBottom: 4,
            }}
          >
            {t("importPdf.previewTitle")}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {t("importPdf.previewSubhead")}
          </div>
        </div>

        {/* File info */}
        <div style={{ padding: "16px 24px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: "var(--bg)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 32,
                height: 40,
                background: "color-mix(in oklch, var(--accent) 15%, var(--bg))",
                border: "1px solid color-mix(in oklch, var(--accent) 30%, var(--bg))",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                fontWeight: 700,
                color: "var(--accent)",
                letterSpacing: "0.05em",
              }}
            >
              PDF
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                title={fileName}
              >
                {fileName}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                {pageCount > 0
                  ? t("importPdf.previewMeta", { pages: pageCount, size: formatFileSize(fileSize) })
                  : formatFileSize(fileSize)}
              </div>
            </div>
            <div
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {formatEstimate(estimatedSec)}
            </div>
          </div>
        </div>

        {/* Simple description */}
        <div style={{ padding: "16px 24px 0" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6 }}>
            {t("importPdf.previewDesc")}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, padding: "20px 24px 24px" }}>
          <button
            onClick={clearPendingImport}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--rule)",
              background: "transparent",
              color: "var(--ink-muted)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              cursor: "pointer",
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--line)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-muted)"; }}
          >
            {t("importPdf.previewCancel")}
          </button>
          <button
            onClick={confirmPendingImport}
            style={{
              flex: 2,
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--ink)",
              color: "var(--bg)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {t("importPdf.previewConfirm")} →
          </button>
        </div>
      </div>
    </div>
  );
}
