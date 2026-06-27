"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import LibCard, { type Play, SCRIPT_TYPE_META, CATEGORY_META } from "./LibCard";
import LibraryEmpty from "./LibraryEmpty";
import { Search, Upload, Pencil } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { createNewPlay } from "@/lib/actions/plays";
import { useRealtimePlays } from "@/hooks/useRealtimePlays";
import { useImportPdf } from "@/hooks/useImportPdf";
import { LANGUAGE_VALUES } from "@/lib/script-meta";

interface LibraryMobileProps {
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
        flexShrink: 0,
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
    <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--ink-faint)", flexShrink: 0, marginRight: 2 }}>
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

export default function LibraryMobile({ plays: initialPlays }: LibraryMobileProps) {
  const t = useTranslations("library");
  const locale = useLocale();
  const router = useRouter();
  const prefix = locale === "fr" ? "/fr" : "";
  const tMeta = useTranslations("meta");
  const [isPending, startTransition] = useTransition();
  const plays = useRealtimePlays(initialPlays);
  const { fileInputRef, handleFileChange, triggerFileInput, isImporting, importingLabel, importError } = useImportPdf();

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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 0 26px" }}>
        <LibraryEmpty />
      </div>
    );
  }

  const scriptTypesPresent = [...new Set(plays.map((p) => p.script_type).filter(Boolean))] as string[];
  const categoriesPresent  = [...new Set(plays.map((p) => p.play_type).filter(Boolean))]   as string[];
  const langsPresent       = [...new Set(plays.map((p) => p.detected_language).filter(Boolean))] as string[];

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
    if (scriptTypeFilter && p.script_type       !== scriptTypeFilter) return false;
    if (categoryFilter   && p.play_type         !== categoryFilter)   return false;
    if (langFilter       && p.detected_language !== langFilter)       return false;
    return true;
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Search */}
      <div style={{ padding: "14px 20px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", color: "var(--ink-faint)", fontSize: 13, fontFamily: "var(--font-body)" }}>
          <Search size={14} />
          {t("searchPlaceholder")}
        </div>
      </div>

      {/* Import error banner */}
      {importError && (
        <div
          style={{
            margin: "0 20px 10px",
            padding: "9px 13px",
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 20px 10px" }}>
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

      {/* Card stack */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredPlays.map((play) => (
          <LibCard key={play.id} play={play} compact />
        ))}
      </div>

      {/* Fixed bottom actions */}
      <div style={{ padding: "12px 20px 26px", display: "flex", gap: 10, background: `linear-gradient(transparent, var(--bg) 35%)`, flexShrink: 0 }}>
        <Button variant="secondary" size="lg" full onClick={handleWrite} disabled={isPending}>
          <Pencil size={15} />{t("write")}
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={handleFileChange} />
        <Button size="lg" full disabled={isPending || isImporting} onClick={triggerFileInput}>
          <Upload size={15} />
          {isImporting ? importingLabel : t("import")}
        </Button>
      </div>
    </div>
  );
}
