import { useTranslations } from "next-intl";
import AuthAside from "@/components/auth/AuthAside";
import SignUpForm from "@/components/auth/SignUpForm";
import LocaleToggle from "@/components/layout/LocaleToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function SignUpPage() {
  const t = useTranslations("auth.signUp");

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
      {/* Theme/locale controls */}
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

      {/* Mobile layout */}
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
        <SignUpForm />
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
        <div style={{ position: "absolute", inset: "0 54% 0 0" }}>
          <AuthAside foot={t("aside")} />
        </div>
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
          <SignUpForm />
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
