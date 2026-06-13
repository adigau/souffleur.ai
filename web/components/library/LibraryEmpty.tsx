"use client";

import { useTranslations } from "next-intl";
import AppIcon from "@/components/ui/AppIcon";
import Mark from "@/components/ui/Mark";
import Button from "@/components/ui/Button";
import { Upload, Pencil, ArrowRight } from "@/components/ui/Icons";

export default function LibraryEmpty() {
  const t = useTranslations("library");

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 12,
          maxWidth: 340,
        }}
      >
        <Button size="lg" full>
          <Upload size={15} />
          {t("import")}
        </Button>
        <Button variant="secondary" size="lg" full>
          <Pencil size={15} />
          {t("write")}
        </Button>
      </div>

      {/* Sample card */}
      <div
        style={{
          maxWidth: 340,
          marginTop: 8,
          padding: "14px 16px",
          borderRadius: "var(--radius-lg)",
          background: "var(--bg-elev)",
          border: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t("empty.tryLabel")}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 2 }}>
            {t("empty.trySub")}
          </div>
        </div>
        <ArrowRight size={16} color="var(--ink-muted)" />
      </div>
    </div>
  );
}
