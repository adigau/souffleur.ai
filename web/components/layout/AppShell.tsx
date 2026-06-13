import Link from "next/link";
import { useLocale } from "next-intl";
import Wordmark from "@/components/ui/Wordmark";
import { Flame } from "@/components/ui/Icons";
import ThemeToggle from "./ThemeToggle";
import LocaleToggle from "./LocaleToggle";

interface AppShellProps {
  children: React.ReactNode;
  userInitial?: string;
  streak?: number;
  crumb?: React.ReactNode;
}

export default function AppShell({
  children,
  userInitial = "?",
  streak,
  crumb,
}: AppShellProps) {
  const locale = useLocale();
  const prefix = locale === "fr" ? "/fr" : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg-elev)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href={`${prefix}/app`} style={{ textDecoration: "none" }}>
            <Wordmark size={17} />
          </Link>
          {crumb && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                letterSpacing: 1.2,
              }}
            >
              {crumb}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {streak !== undefined && streak > 0 && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-muted)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Flame size={13} color="var(--accent)" />
              {streak}
            </div>
          )}
          <LocaleToggle />
          <ThemeToggle />
          <Link
            href={`${prefix}/app/account`}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "var(--ink)",
              color: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              textDecoration: "none",
            }}
          >
            {userInitial}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}
