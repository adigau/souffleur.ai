import { useTranslations } from "next-intl";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import Mark from "@/components/ui/Mark";
import Button from "@/components/ui/Button";
import { Warn } from "@/components/ui/Icons";

export interface Play {
  id: string;
  title: string;
  author?: string;
  role?: string;
  off_book_pct?: number;
  last_practiced?: string | null;
  state: "ready" | "processing" | "attention";
  note?: string;
  progress?: number;
  is_monologue?: boolean;
}

interface LibCardProps {
  play: Play;
  compact?: boolean;
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
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <Progress value={play.progress ?? 0} height={5} />
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-muted)",
              }}
            >
              {play.progress ?? 0}%
            </span>
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--ink-faint)",
              marginTop: 8,
            }}
          >
            {t("processingHint")}
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

    return (
      <div style={{ marginTop: 14 }}>
        {play.role && (
          <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginBottom: 10 }}>
            {t("asRole")}{" "}
            <Mark>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{play.role}</span>
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
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: pad,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
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
          {play.is_monologue && <Badge tone="neutral">Monologue</Badge>}
          {play.state === "processing" && <Badge tone="accent">{t("processing")}</Badge>}
          {play.state === "attention" && <Badge tone="neutral">{t("attentionBadge")}</Badge>}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 3 }}>
          {play.author}
        </div>
      </div>
      {body}
    </div>
  );
}
