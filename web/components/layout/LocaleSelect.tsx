"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Chev } from "@/components/ui/Icons";

const LOCALES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
] as const;

export default function LocaleSelect() {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 22px" }}>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t("language")}</span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          value={locale}
          onChange={(e) => router.replace(pathname, { locale: e.target.value as "en" | "fr" })}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            background: "transparent",
            border: "none",
            fontSize: 12.5,
            color: "var(--ink-muted)",
            cursor: "pointer",
            paddingRight: 18,
            fontFamily: "var(--font-body)",
            outline: "none",
          }}
        >
          {LOCALES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div style={{ position: "absolute", right: 0, pointerEvents: "none", display: "flex", alignItems: "center" }}>
          <Chev size={12} color="var(--ink-faint)" />
        </div>
      </div>
    </div>
  );
}
