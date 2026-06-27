"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import LibCard, { type Play, SCRIPT_TYPE_META, CATEGORY_META } from "./LibCard";
import LibraryEmpty from "./LibraryEmpty";
import { Upload, Search } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { createNewPlay } from "@/lib/actions/plays";
import { useRealtimePlays } from "@/hooks/useRealtimePlays";
import { useImportPdf } from "@/hooks/useImportPdf";
import { LANGUAGE_VALUES } from "@/lib/script-meta";

interface LibraryDesktopProps {
  plays: Play[];
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.7,
        padding: "3px 9px",
        borderRadius: 99,
        border: `1px solid ${active ? "var(--accent)" : "var(--rule)"}`,
        background: active ? "var(--accent-soft)" : "var(--surface)",
        color: active ? "var(--accent)" : "var(--ink-faint)",
        cursor: "pointer",
        transition: "all 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function FilterRow({ heading, values, active, onSelect }: {
  heading: string;
  values: { value: string; label: string }[];
  active: string | null;
  onSelect: (v: string | null) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--ink-faint)", marginRight: 2, flexShrink: 0 }}>
        {heading}
      </span>
      <FilterPill label="All" active={active === null} onClick={() => onSelect(null)} />
      {values.map(({ value, label }) => (
        <FilterPill
          key={value}
          label={label}
          active={active === value}
          onClick={() => onSelect(active === value ? null : value)}
        />
      ))}
    </div>
  );
}

export default function LibraryDesktop({ plays: initialPlays }: LibraryDesktopProps) {
  const t = useTranslations("library");
  const locale = useLocale();
  const router = useRouter();
  const prefix = locale === "fr" ? "/fr" : "";
  const tMeta = useTranslations("meta");
  const [isPending, startTransition] = useTransition();
  const plays = useRealtimePlays(initialPlays);
  const { fileInputRef, handleFileChange, handleFileDrop, triggerFileInput, isImporting, importingLabel, importError } = useImportPdf();
  const [isDragging, setIsDragging] = useState(false);

  const [scriptTypeFilter, setScriptTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter]     = useState<string | null>(null);
  const [langFilter, setLangFilter]             = useState<string | null>(null);

  function handleWrite() {
    startTransition(async () => {
      const result = await createNewPlay();
      if (result.id) router.push(`${prefix}/app/plays/${result.id}/edit`);
      else console.error("[Write]", result.error);
    });
  }

  if (plays.length === 0) {
    return (
      <div style={{ padding: "28px 32px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <LibraryEmpty />
      </div>
    );
  }

  // Collect distinct values that are actually present in the library
  const scriptTypesPresent = [...new Set(plays.map((p) => p.script_type).filter(Boolean))] as string[];
  const categoriesPresent  = [...new Set(plays.map((p) => p.play_type).filter(Boolean))]   as string[];
  const langsPresent       = [...new Set(plays.map((p) => p.detected_language).filter(Boolean))] as string[];

  // Build filter option lists from our hardcoded meta (preserving canonical order)
  const scriptTypeOpts = Object.keys(SCRIPT_TYPE_META)
    .filter((v) => scriptTypesPresent.includes(v))
    .map((v) => ({ value: v, label: tMeta(`scriptType.${v}` as any) }));

  const categoryOpts = Object.keys(CATEGORY_META)
    .filter((v) => categoriesPresent.includes(v))
    .map((v) => ({ value: v, label: tMeta(`category.${v}` as any) }));

  const langOpts = LANGUAGE_VALUES
    .filter((l) => langsPresent.includes(l.value))
    .map((l) => ({ value: l.value, label: tMeta(`language.${l.value}` as any) }));

  const hasFilters = scriptTypeOpts.length >= 1 || categoryOpts.length >= 1 || langOpts.length >= 1;

  const filteredPlays = plays.filter((p) => {
    if (scriptTypeFilter && p.script_type    !== scriptTypeFilter) return false;
    if (categoryFilter   && p.play_type      !== categoryFilter)   return false;
    if (langFilter       && p.detected_language !== langFilter)    return false;
    return true;
  });

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  }

  return (
    <div
      style={{ padding: "28px 32px", height: "100%", overflow: "auto", boxSizing: "border-box" }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, letterSpacing: -0.6 }}>
            {t("title")}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
            {plays.length} {t("subtitle")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px", width: 200, background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", color: "var(--ink-faint)", fontSize: 13, fontFamily: "var(--font-body)" }}>
            <Search size={14} />
            {t("searchPlaceholder")}
          </div>
          <Button variant="secondary" size="sm" onClick={handleWrite} disabled={isPending}>{t("write")}</Button>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={handleFileChange} />
          <Button size="sm" disabled={isPending || isImporting} onClick={triggerFileInput}>
            <Upload size={14} />
            {isImporting ? importingLabel : t("import")}
          </Button>
        </div>
      </div>

      {/* Import error banner */}
      {importError && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "color-mix(in oklch, var(--rose) 10%, var(--bg))",
            border: "1px solid color-mix(in oklch, var(--rose) 30%, var(--bg))",
            color: "var(--rose)",
            fontSize: 13,
          }}
        >
          {importError}
        </div>
      )}

      {/* Filters */}
      {hasFilters && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
          {scriptTypeOpts.length >= 1 && (
            <FilterRow heading="Format" values={scriptTypeOpts} active={scriptTypeFilter} onSelect={setScriptTypeFilter} />
          )}
          {categoryOpts.length >= 1 && (
            <FilterRow heading="Category" values={categoryOpts} active={categoryFilter} onSelect={setCategoryFilter} />
          )}
          {langOpts.length >= 1 && (
            <FilterRow heading="Language" values={langOpts} active={langFilter} onSelect={setLangFilter} />
          )}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {filteredPlays.map((play) => (
          <LibCard key={play.id} play={play} />
        ))}
        <button
          onClick={triggerFileInput}
          style={{
            border: `1.5px dashed ${isDragging ? "var(--accent)" : "var(--rule)"}`,
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: isDragging ? "var(--accent)" : "var(--ink-faint)",
            fontSize: 12.5,
            textAlign: "center",
            minHeight: 150,
            background: isDragging ? "var(--accent-faint)" : "transparent",
            cursor: "pointer",
            transition: "border-color 0.15s, color 0.15s, background 0.15s",
            width: "100%",
            fontFamily: "var(--font-body)",
          }}
        >
          <Upload size={18} color="currentColor" />
          <span>{t("dropHint")}</span>
        </button>
      </div>
    </div>
  );
}
