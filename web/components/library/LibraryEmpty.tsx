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

const SAMPLE_PLAYS = [
  { title: "Hamlet", author: "William Shakespeare" },
  { title: "The Seagull", author: "Anton Chekhov" },
  { title: "A Doll's House", author: "Henrik Ibsen" },
] as const;

type SamplePlay = (typeof SAMPLE_PLAYS)[number];

export default function LibraryEmpty() {
  const t = useTranslations("library");
  const locale = useLocale();
  const router = useRouter();
  const prefix = locale === "fr" ? "/fr" : "";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<SamplePlay | null>(null);
  const { fileInputRef, handleFileChange, triggerFileInput, isImporting, importingLabel, importError } = useImportPdf();

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

  function handleAddSample() {
    if (!selectedSample) return;
    setError(null);
    startTransition(async () => {
      const result = await addSampleToLibrary(selectedSample.title);
      if (result.id) {
        router.push(`${prefix}/app/plays/${result.id}`);
      } else {
        setError(result.error ?? "Something went wrong");
        setSelectedSample(null);
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
      <div style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.55, maxWidth: 380 }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4, maxWidth: 340 }}>
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
          {isImporting ? importingLabel : t("import")}
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

      {/* Sample play library */}
      <div style={{ maxWidth: 340, marginTop: 4 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--ink-faint)",
            marginBottom: 8,
          }}
        >
          {t("empty.libraryTitle")}
        </div>

        <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--rule)", overflow: "hidden" }}>
          {selectedSample ? (
            /* Confirmation panel */
            <>
              <button
                onClick={() => { if (!isPending) setSelectedSample(null); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 14px",
                  width: "100%",
                  background: "var(--bg-elev)",
                  border: "none",
                  borderBottom: "1px solid var(--rule)",
                  cursor: isPending ? "default" : "pointer",
                  color: "var(--ink-muted)",
                  fontSize: 12,
                  fontFamily: "var(--font-body)",
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                ← {t("empty.backToLibrary")}
              </button>
              <div style={{ padding: "14px 14px 16px", background: "var(--bg-elev)" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                  {selectedSample.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                  {selectedSample.author}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: 10, lineHeight: 1.55 }}>
                  {t("empty.confirmHint")}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Button size="sm" disabled={isPending} onClick={handleAddSample} style={{ opacity: isPending ? 0.6 : 1 }}>
                    {isPending ? t("empty.adding") : t("empty.addCta")}
                  </Button>
                  <Button variant="secondary" size="sm" disabled={isPending} onClick={() => setSelectedSample(null)}>
                    {t("empty.cancel")}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Play list */
            SAMPLE_PLAYS.map((play, i) => (
              <button
                key={play.title}
                onClick={() => setSelectedSample(play)}
                disabled={isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 14px",
                  width: "100%",
                  background: "var(--bg-elev)",
                  border: "none",
                  borderTop: i > 0 ? "1px solid var(--rule)" : "none",
                  cursor: isPending ? "default" : "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-body)",
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{play.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 1 }}>{play.author}</div>
                </div>
                <ArrowRight size={14} color="var(--ink-faint)" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
