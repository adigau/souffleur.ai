import Link from "next/link";
import AppIcon from "@/components/ui/AppIcon";
import Wordmark from "@/components/ui/Wordmark";
import LocaleToggle from "@/components/layout/LocaleToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--line) 31px, var(--line) 32px)`,
      }}
    >
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

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: "40px 44px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <AppIcon size={44} />
        </div>

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: -0.5,
            lineHeight: 1.15,
          }}
        >
          Check your inbox
        </div>

        <div
          style={{
            fontSize: 13.5,
            color: "var(--ink-muted)",
            lineHeight: 1.6,
            marginTop: 12,
          }}
        >
          We sent a confirmation link to{" "}
          {email ? (
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{email}</span>
          ) : (
            "your email address"
          )}
          . Click it to activate your account and get into your library.
        </div>

        <div
          style={{
            marginTop: 28,
            padding: "14px 16px",
            background: "var(--bg-elev)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--ink-faint)",
            lineHeight: 1.55,
            textAlign: "left",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "var(--ink-faint)",
              display: "block",
              marginBottom: 6,
            }}
          >
            Didn't get it?
          </span>
          Check your spam folder. The email comes from{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            noreply@supabase.io
          </span>{" "}
          while in development.
        </div>

        <div style={{ marginTop: 24 }}>
          <Link
            href="/login"
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              textDecoration: "none",
            }}
          >
            Back to sign in
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Wordmark size={15} />
        </Link>
      </div>
    </div>
  );
}
