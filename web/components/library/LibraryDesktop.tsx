"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import LibCard, { type Play } from "./LibCard";
import LibraryEmpty from "./LibraryEmpty";
import { Upload, Search } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { createNewPlay } from "@/lib/actions/plays";
import { useRealtimePlays } from "@/hooks/useRealtimePlays";

interface LibraryDesktopProps {
  plays: Play[];
}

export default function LibraryDesktop({ plays: initialPlays }: LibraryDesktopProps) {
  const t = useTranslations("library");
  const locale = useLocale();
  const router = useRouter();
  const prefix = locale === "fr" ? "/fr" : "";
  const [isPending, startTransition] = useTransition();
  const plays = useRealtimePlays(initialPlays);

  function handleWrite() {
    startTransition(async () => {
      const result = await createNewPlay();
      if (result.id) router.push(`${prefix}/app/plays/${result.id}/edit`);
      else console.error("[Write]", result.error);
    });
  }

  if (plays.length === 0) {
    return (
      <div
        style={{
          padding: "28px 32px",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LibraryEmpty />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "28px 32px",
        height: "100%",
        overflow: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: -0.6,
            }}
          >
            {t("title")}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
            {plays.length} {t("subtitle")}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 36,
              padding: "0 12px",
              width: 200,
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

          <Button variant="secondary" size="sm" onClick={handleWrite} disabled={isPending}>
            {t("write")}
          </Button>
          <Button size="sm" disabled>
            <Upload size={14} />
            {t("import")}
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {plays.map((play) => (
          <LibCard key={play.id} play={play} />
        ))}

        {/* Drop zone */}
        <div
          style={{
            border: "1.5px dashed var(--rule)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "var(--ink-faint)",
            fontSize: 12.5,
            textAlign: "center",
            minHeight: 150,
          }}
        >
          <Upload size={18} color="var(--ink-faint)" />
          <span>
            {t("dropHint").split(" to ")[0]}
            <br />
            to {t("dropHint").split(" to ")[1]}
          </span>
        </div>
      </div>
    </div>
  );
}
