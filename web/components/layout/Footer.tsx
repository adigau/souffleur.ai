import { useTranslations, useLocale } from "next-intl";
import Wordmark from "@/components/ui/Wordmark";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("marketing.footer");
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";

  return (
    <footer
      style={{
        borderTop: "1px solid var(--rule)",
        padding: "32px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        background: "var(--bg-elev)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Wordmark size={15} />
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-faint)",
            fontFamily: "var(--font-body)",
          }}
        >
          {t("tagline")}
        </span>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {[
          { key: "terms", href: `${prefix}/terms` },
          { key: "privacy", href: `${prefix}/privacy` },
        ].map(({ key, href }) => (
          <Link
            key={key}
            href={href}
            style={{
              fontSize: 12,
              color: "var(--ink-faint)",
              textDecoration: "none",
              fontFamily: "var(--font-body)",
            }}
          >
            {t(key as "terms" | "privacy")}
          </Link>
        ))}
      </div>
    </footer>
  );
}
