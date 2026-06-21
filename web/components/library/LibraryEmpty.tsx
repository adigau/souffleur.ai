"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import AppIcon from "@/components/ui/AppIcon";
import Mark from "@/components/ui/Mark";
import Button from "@/components/ui/Button";
import { Upload, Pencil, ArrowRight } from "@/components/ui/Icons";
import { createNewPlay, addSampleToLibrary } from "@/lib/actions/plays";
import { useImportPdf } from "@/hooks/useImportPdf";

export default function LibraryEmpty() {
  const t = useTranslations("library");
  const locale = useLocale();
  const router = useRouter();
  const prefix = locale === "fr" ? "/fr" : "";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { fileInputRef, handleFileChange, triggerFileInput, isImporting, importError } = useImportPdf();

  function handleWrite() {
    setError(null);
    startTransition(async () => {
      const result = await createNewPlay();
      if (result.id) {
        router.push(`${prefix}/app/plays/${result.id}/edit`);
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  function handleSample() {
    setError(null);
    startTransition(async () => {
      const result = await addSampleToLibrary("Hamlet");
      if (result.id) {
        router.push(`${prefix}/app/plays/${result.id}`);
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 14,
        padding: "0 24px",
      }}
    >
      <AppIcon size={56} />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: -0.6,
          lineHeight: 1.1,
        }}
      >
        {t("empty.headline")}{" "}
        <Mark>
          <span style={{ fontStyle: "italic" }}>{t("empty.headlineItalic")}</span>
        </Mark>
      </div>
      <div
        style={{
          fontSize: 14,
          color: "var(--ink-muted)",
          lineHeight: 1.55,
          maxWidth: 380,
        }}
      >
        {t("empty.subhead")}
      </div>

      {(error || importError) && (
        <div
          style={{
            maxWidth: 340,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "color-mix(in oklch, var(--rose) 10%, var(--bg))",
            border: "1px solid color-mix(in oklch, var(--rose) 30%, var(--bg))",
            color: "var(--rose)",
            fontSize: 13,
          }}
        >
          {error ?? importError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 4,
          maxWidth: 340,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <Button
          size="lg"
          full
          disabled={isPending || isImporting}
          onClick={triggerFileInput}
          style={{ opacity: isPending || isImporting ? 0.6 : 1 }}
        >
          <Upload size={15} />
          {isImporting ? t("importPdf.importing") : t("import")}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          full
          disabled={isPending}
          onClick={handleWrite}
          style={{ opacity: isPending ? 0.6 : 1 }}
        >
          <Pencil size={15} />
          {isPending ? "…" : t("write")}
        </Button>
      </div>

      <button
        onClick={handleSample}
        disabled={isPending}
        style={{
          maxWidth: 340,
          marginTop: 4,
          padding: "14px 16px",
          borderRadius: "var(--radius-lg)",
          background: "var(--bg-elev)",
          border: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.6 : 1,
          textAlign: "left",
          width: "100%",
          fontFamily: "var(--font-body)",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            {isPending ? "Loading…" : t("empty.tryLabel")}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 2 }}>
            {t("empty.trySub")}
          </div>
        </div>
        <ArrowRight size={16} color="var(--ink-muted)" />
      </button>
    </div>
  );
}
