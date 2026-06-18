import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import Mark from "@/components/ui/Mark";
import Button from "@/components/ui/Button";
import { Warn, Sparkle } from "@/components/ui/Icons";

export interface Play {
  id: string;
  title: string;
  author?: string;
  role?: string[];
  off_book_pct?: number;
  last_practiced?: string | null;
  state: "ready" | "processing" | "attention";
  note?: string;
  progress?: number;
  is_monologue?: boolean;
  description?: string;
  play_type?: string;
}

interface LibCardProps {
  play: Play;
  compact?: boolean;
}

function ShimmerLine({ width = "100%", height = 12 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="souffleur-shimmer"
      style={{ width, height, borderRadius: 3 }}
    />
  );
}

export default function LibCard({ play, compact = false }: LibCardProps) {
  const t = useTranslations("library");
  const pad = compact ? 16 : 20;

  const relativeDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Practiced today";
    if (days === 1) return "Practiced yesterday";
    return `Practiced ${days} days ago`;
  };

  const body = (() => {
    if (play.state === "processing") {
      return (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Shimmer skeleton for the description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <ShimmerLine width="95%" height={11} />
            <ShimmerLine width="78%" height={11} />
          </div>

          {/* Thin animated progress bar */}
          <div
            style={{
              marginTop: 4,
              height: 2,
              background: "var(--line)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              className="souffleur-shimmer"
              style={{ height: "100%", width: "100%" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--ink-faint)",
            }}
          >
            <Sparkle size={10} color="var(--accent)" />
            <span style={{ fontFamily: "var(--font-mono)" }}>Analysing play…</span>
          </div>
        </div>
      );
    }

    if (play.state === "attention") {
      return (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              color: "var(--ink-muted)",
            }}
          >
            <Warn size={14} color="var(--accent)" />
            {t("attention")} {play.note}
          </div>
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" size="sm">
              {t("reviewEditor")}
            </Button>
          </div>
        </div>
      );
    }

    // Ready state
    return (
      <div style={{ marginTop: 14 }}>
        {/* AI description — shown when available */}
        {play.description && (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-muted)",
              lineHeight: 1.55,
              marginBottom: 10,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
            }}
          >
            {play.description}
          </div>
        )}

        {play.role && play.role.length > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginBottom: 10 }}>
            {t("asRole")}{" "}
            <Mark>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{play.role.join(", ")}</span>
            </Mark>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Progress value={play.off_book_pct ?? 0} height={5} />
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {play.off_book_pct ?? 0}
            {t("offBook")}
          </span>
        </div>
        {play.last_practiced && (
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 8 }}>
            {relativeDate(play.last_practiced)}
          </div>
        )}
      </div>
    );
  })();

  return (
    <Link
      href={`/app/plays/${play.id}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: pad,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Processing: thin shimmer line across the very top of the card */}
      {play.state === "processing" && (
        <div
          className="souffleur-shimmer"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
          }}
        />
      )}

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: compact ? 17 : 19,
              fontWeight: 500,
              letterSpacing: -0.3,
              lineHeight: 1.2,
            }}
          >
            {play.title}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
            {play.play_type && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: 0.8,
                color: "var(--ink-faint)", background: "var(--surface)",
                border: "1px solid var(--rule)", padding: "1px 6px", borderRadius: 99,
              }}>
                {play.play_type}
              </span>
            )}
            {play.is_monologue && <Badge tone="neutral">Monologue</Badge>}
            {play.state === "processing" && (
              <Badge tone="accent">{t("processing")}</Badge>
            )}
            {play.state === "attention" && (
              <Badge tone="neutral">{t("attentionBadge")}</Badge>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 3 }}>
          {play.author}
        </div>
      </div>
      {body}
    </Link>
  );
}
