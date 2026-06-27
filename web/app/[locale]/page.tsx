import { useTranslations } from "next-intl";
import Link from "next/link";
import MarketingNav from "@/components/layout/MarketingNav";
import Footer from "@/components/layout/Footer";
import Mark from "@/components/ui/Mark";

function HeroSection() {
  const t = useTranslations("marketing.hero");

  return (
    <section
      style={{
        minHeight: "calc(100dvh - 52px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px 64px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ruled paper lines decoration */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--line) 31px, var(--line) 32px)`,
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680 }}>
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: "var(--ink-faint)",
            marginBottom: 24,
          }}
        >
          {t("eyebrow")}
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px, 8vw, 84px)",
            fontWeight: 500,
            letterSpacing: -2,
            lineHeight: 1.0,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          {t("headline")}{" "}
          <span style={{ fontStyle: "italic" }}>
            <Mark tone="accent">{t("headlineItalic")}</Mark>
          </span>
        </h1>

        {/* Subhead */}
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(15px, 2vw, 17px)",
            color: "var(--ink-muted)",
            lineHeight: 1.65,
            marginTop: 24,
            maxWidth: 520,
            marginInline: "auto",
          }}
        >
          {t("subhead")}
        </p>

        {/* CTAs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginTop: 40,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/signup"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              background: "var(--accent)",
              textDecoration: "none",
              padding: "12px 28px",
              borderRadius: "var(--radius-md)",
              display: "inline-block",
            }}
          >
            {t("cta")}
          </Link>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            {t("ctaSub")}
          </span>
          <Link
            href="/login"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink-muted)",
              textDecoration: "none",
            }}
          >
            {t("ctaSignIn")}
          </Link>
        </div>
      </div>

      {/* Script card preview */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 64,
          maxWidth: 420,
          width: "100%",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: "24px 28px",
            transform: "rotate(-0.8deg)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              borderBottom: "1px solid var(--rule)",
              paddingBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontStyle: "italic",
              }}
            >
              Hamlet
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                color: "var(--ink-faint)",
              }}
            >
              Act III · Scene 1
            </span>
          </div>
          {[
            { ch: "OPHELIA", text: "Good my lord, how does your honour for this many a day?", you: false },
            { ch: "HAMLET", text: "I humbly thank you; well, well, well.", you: true },
            { ch: "OPHELIA", text: "My lord, I have remembrances of yours…", you: false },
            { ch: "HAMLET", text: "No, not I; I never gave you aught.", you: true },
          ].map((line, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  letterSpacing: 1.2,
                  color: line.you ? "var(--accent)" : "var(--ink-faint)",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {line.ch}{line.you && " · you"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: line.you ? "var(--ink)" : "var(--ink-muted)",
                }}
              >
                {line.you ? <Mark>{line.text}</Mark> : line.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const t = useTranslations("marketing.hero");

  const features = [
    { label: "01", text: t("feature1") },
    { label: "02", text: t("feature2") },
    { label: "03", text: t("feature3") },
  ];

  return (
    <section
      style={{
        borderTop: "1px solid var(--rule)",
        padding: "72px 24px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "48px 64px",
        maxWidth: 960,
        marginInline: "auto",
        width: "100%",
      }}
    >
      {features.map((f) => (
        <div key={f.label}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "var(--accent)",
              marginBottom: 12,
            }}
          >
            {f.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontStyle: "italic",
              lineHeight: 1.4,
              color: "var(--ink)",
            }}
          >
            {f.text}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function MarketingPage() {
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
      <MarketingNav />
      <main style={{ flex: 1 }}>
        <HeroSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
}
