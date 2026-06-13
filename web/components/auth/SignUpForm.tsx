"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Google } from "@/components/ui/Icons";
import { signUpWithEmail, signInWithGoogle } from "@/lib/actions/auth";
import { useSearchParams } from "next/navigation";

export default function SignUpForm() {
  const t = useTranslations("auth.signUp");
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 352,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Eyebrow */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: "var(--ink-muted)",
        }}
      >
        {t("eyebrow")}
      </span>

      {/* Headline */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: -0.8,
          lineHeight: 1.1,
          marginTop: 10,
        }}
      >
        {t("headline")}{" "}
        <span style={{ fontStyle: "italic" }}>{t("headlineItalic")}</span>
      </div>

      <div
        style={{
          fontSize: 13.5,
          color: "var(--ink-muted)",
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        {t("subhead")}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "color-mix(in oklch, var(--rose) 10%, var(--surface))",
            border: "1px solid color-mix(in oklch, var(--rose) 30%, var(--rule))",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            color: "var(--rose)",
          }}
        >
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Social */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}
      >
        <form action={() => signInWithGoogle(locale)}>
          <button
            type="submit"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              height: 44,
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Google size={18} />
            {t("google")}
          </button>
        </form>
      </div>

      {/* Or divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "18px 0",
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--rule)" }} />
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          {t("or")}
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--rule)" }} />
      </div>

      {/* Email form */}
      <form action={signUpWithEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="hidden" name="locale" value={locale} />
        <Input
          label={t("emailLabel")}
          name="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
          required
        />
        <Input
          label={t("passwordLabel")}
          name="password"
          type="password"
          placeholder={t("passwordPlaceholder")}
          autoComplete="new-password"
          required
          minLength={10}
        />
        <div style={{ marginTop: 6 }}>
          <Button type="submit" variant="primary" size="lg" full>
            {t("submit")}
          </Button>
        </div>
      </form>

      {/* Legal */}
      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "var(--ink-faint)",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {t("terms")}{" "}
        <Link
          href={`${prefix}/terms`}
          style={{ color: "var(--ink-muted)", textDecoration: "underline" }}
        >
          {t("termsLink")}
        </Link>{" "}
        {t("and")}{" "}
        <Link
          href={`${prefix}/privacy`}
          style={{ color: "var(--ink-muted)", textDecoration: "underline" }}
        >
          {t("privacyLink")}
        </Link>
        .
      </div>

      {/* Switch to signin */}
      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          color: "var(--ink-muted)",
          textAlign: "center",
        }}
      >
        {t("haveAccount")}{" "}
        <Link
          href={`${prefix}/login`}
          style={{
            color: "var(--accent)",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          {t("signIn")}
        </Link>
      </div>
    </div>
  );
}
