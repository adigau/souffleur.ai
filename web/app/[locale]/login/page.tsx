import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import AuthAside from "@/components/auth/AuthAside";
import SignInForm from "@/components/auth/SignInForm";
import LocaleToggle from "@/components/layout/LocaleToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const locale = await getLocale();
    const prefix = locale === "fr" ? "/fr" : "";
    redirect(`${prefix}/app`);
  }

  const t = await getTranslations("auth.signIn");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Theme/locale controls — top-right on mobile */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          display: "flex",
          gap: 8,
          zIndex: 10,
        }}
      >
        <LocaleToggle />
        <ThemeToggle />
      </div>

      {/* Mobile layout: stacked, centered */}
      <div
        className="auth-mobile"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px 48px",
        }}
      >
        <SignInForm />
      </div>

      {/* Desktop layout: 46/54 split */}
      <div
        className="auth-desktop"
        style={{
          position: "fixed",
          inset: 0,
          display: "none",
        }}
      >
        {/* Aside: 46% */}
        <div style={{ position: "absolute", inset: "0 54% 0 0" }}>
          <AuthAside foot={t("aside")} />
        </div>
        {/* Form: 54% */}
        <div
          style={{
            position: "absolute",
            inset: "0 0 0 46%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px",
            overflowY: "auto",
          }}
        >
          <SignInForm />
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .auth-mobile { display: none !important; }
          .auth-desktop { display: block !important; }
        }
      `}</style>
    </div>
  );
}
