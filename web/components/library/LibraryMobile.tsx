"use client";

import { useTranslations } from "next-intl";
import LibCard, { type Play } from "./LibCard";
import LibraryEmpty from "./LibraryEmpty";
import { Search, Upload, Pencil } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";

interface LibraryMobileProps {
  plays: Play[];
}

export default function LibraryMobile({ plays }: LibraryMobileProps) {
  const t = useTranslations("library");

  if (plays.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "12px 0 26px",
        }}
      >
        <LibraryEmpty />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Search */}
      <div style={{ padding: "14px 20px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 38,
            padding: "0 12px",
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            color: "var(--ink-faint)",
            fontSize: 13,
            fontFamily: "var(--font-body)",
          }}
        >
          <Search size={14} />
          {t("searchPlaceholder")}
        </div>
      </div>

      {/* Card stack */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "0 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {plays.map((play) => (
          <LibCard key={play.id} play={play} compact />
        ))}
      </div>

      {/* Fixed bottom actions */}
      <div
        style={{
          padding: "12px 20px 26px",
          display: "flex",
          gap: 10,
          background: `linear-gradient(transparent, var(--bg) 35%)`,
          flexShrink: 0,
        }}
      >
        <Button variant="secondary" size="lg" full>
          <Pencil size={15} />
          {t("write")}
        </Button>
        <Button size="lg" full>
          <Upload size={15} />
          {t("import")}
        </Button>
      </div>
    </div>
  );
}
