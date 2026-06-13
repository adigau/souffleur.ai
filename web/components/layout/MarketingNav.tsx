import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import Wordmark from "@/components/ui/Wordmark";
import ThemeToggle from "./ThemeToggle";
import LocaleToggle from "./LocaleToggle";

export default function MarketingNav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "color-mix(in oklch, var(--bg) 85%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <Link href={`${prefix}/`} style={{ textDecoration: "none" }}>
        <Wordmark size={18} />
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LocaleToggle />
        <ThemeToggle />
        <Link
          href={`${prefix}/login`}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ink-muted)",
            textDecoration: "none",
            padding: "6px 12px",
          }}
        >
          {t("signIn")}
        </Link>
        <Link
          href={`${prefix}/signup`}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            textDecoration: "none",
            background: "var(--accent)",
            padding: "6px 14px",
            borderRadius: "var(--radius-md)",
          }}
        >
          {t("getStarted")}
        </Link>
      </div>
    </nav>
  );
}
