"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

export default function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const next = locale === "en" ? "fr" : "en";
    // Replace locale prefix in path
    const stripped = pathname.replace(/^\/(en|fr)/, "");
    const newPath = next === "en" ? stripped || "/" : `/fr${stripped || ""}`;
    router.push(newPath);
  }

  return (
    <button
      onClick={switchLocale}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: "var(--ink-muted)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "4px 8px",
      }}
    >
      {locale === "en" ? "FR" : "EN"}
    </button>
  );
}
