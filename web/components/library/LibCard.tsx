import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import Mark from "@/components/ui/Mark";
import Button from "@/components/ui/Button";
import { Warn, Sparkle } from "@/components/ui/Icons";
import { SCRIPT_TYPE_VALUES, CATEGORY_VALUES, LANGUAGE_VALUES } from "@/lib/script-meta";

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
  script_type?: string;
  detected_language?: string;
}

interface LibCardProps {
  play: Play;
  compact?: boolean;
}

type IconComp = ({ size }: { size?: number }) => React.ReactElement;

// ─── Script-type icons ───────────────────────────────────────────────────────

function TheaterPlayIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
      <ellipse cx="4" cy="5.5" rx="3.2" ry="3.8" fill="currentColor" fillOpacity="0.15" />
      <ellipse cx="4" cy="5.5" rx="3.2" ry="3.8" />
      <path d="M2.5 7 Q4 8.8 5.5 7" />
      <ellipse cx="8.2" cy="6.5" rx="2.8" ry="3.4" fill="currentColor" fillOpacity="0.2" />
      <ellipse cx="8.2" cy="6.5" rx="2.8" ry="3.4" />
      <path d="M6.7 8.5 Q8.2 6.8 9.7 8.5" />
    </svg>
  );
}

function MovieIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <rect x="1" y="4.5" width="10" height="6.5" rx="1" fillOpacity="0.18" />
      <rect x="1" y="4.5" width="10" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="1" y="2.5" width="10" height="2.5" rx="0.6" />
      <line x1="4" y1="2.5" x2="3.2" y2="5" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="6.5" y1="2.5" x2="5.7" y2="5" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="9" y1="2.5" x2="8.2" y2="5" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function ShortFilmIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <rect x="1" y="2" width="10" height="8" rx="1" fillOpacity="0.15" />
      <rect x="1" y="2" width="10" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="2.5" width="1.5" height="2" rx="0.3" />
      <rect x="1.5" y="7.5" width="1.5" height="2" rx="0.3" />
      <rect x="9" y="2.5" width="1.5" height="2" rx="0.3" />
      <rect x="9" y="7.5" width="1.5" height="2" rx="0.3" />
      <line x1="4" y1="2" x2="4" y2="10" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" />
      <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" />
    </svg>
  );
}

function TvEpisodeIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeLinecap="round">
      <rect x="0.8" y="2.5" width="10.4" height="7.5" rx="1.2" fill="currentColor" fillOpacity="0.18" strokeWidth="1" />
      <rect x="2.5" y="4" width="7" height="4.5" rx="0.6" fill="currentColor" fillOpacity="0.18" strokeWidth="0.7" />
      <line x1="4.5" y1="10" x2="3.5" y2="11.5" strokeWidth="0.9" />
      <line x1="7.5" y1="10" x2="8.5" y2="11.5" strokeWidth="0.9" />
    </svg>
  );
}

function SitcomIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeLinecap="round">
      <rect x="0.8" y="3.5" width="10.4" height="7.5" rx="1.2" fill="currentColor" fillOpacity="0.18" strokeWidth="1" />
      <rect x="2.5" y="5" width="7" height="4.5" rx="0.6" fill="currentColor" fillOpacity="0.18" strokeWidth="0.7" />
      <line x1="4.2" y1="3.5" x2="3.2" y2="1" strokeWidth="1" />
      <line x1="7.8" y1="3.5" x2="8.8" y2="1" strokeWidth="1" />
    </svg>
  );
}

function MusicalIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <circle cx="3.5" cy="9" r="2" />
      <circle cx="8.5" cy="7.5" r="2" />
      <rect x="5.3" y="1" width="1.2" height="8.5" rx="0.4" />
      <path d="M6.5 1 L10.5 2.5 L10.5 5 L6.5 3.5 Z" fillOpacity="0.8" />
    </svg>
  );
}

function OperaIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <path d="M1 1.5 Q1 6 3 8 L3 11 Q1 11 1 11" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" fill="currentColor" />
      <path d="M11 1.5 Q11 6 9 8 L9 11 Q11 11 11 11" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" fill="currentColor" />
      <circle cx="6" cy="4.5" r="1.5" />
      <line x1="6" y1="6" x2="6" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4.5" y1="7" x2="7.5" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function MonologueIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4.5" cy="3" r="2.2" />
      <path d="M1 11.5 Q1 8 4.5 7.2 Q7 7.8 7 10.5" fillOpacity="0.35" />
      <rect x="6.5" y="1" width="4.5" height="3" rx="0.8" />
      <polygon points="7,4 6,5.5 8.5,4" />
    </svg>
  );
}

function RadioDramaIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <rect x="4" y="1" width="4" height="6" rx="2" />
      <path d="M2.5 5.5 Q2.5 9 6 9 Q9.5 9 9.5 5.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="6" y1="9" x2="6" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// ─── Genre / Category icons ───────────────────────────────────────────────────

function DramaIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <polygon points="6,1 11,11 1,11" fillOpacity="0.2" />
      <polygon points="6,1 11,11 1,11" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <line x1="6" y1="4" x2="6" y2="8.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="6" cy="9.5" r="0.6" />
    </svg>
  );
}

function ComedyIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <circle cx="6" cy="6" r="4.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="6" cy="6" r="4.5" />
      <path d="M3.5 7.5 Q6 9.5 8.5 7.5" strokeWidth="1.1" />
      <circle cx="4.2" cy="5" r="0.5" fill="currentColor" />
      <circle cx="7.8" cy="5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function TragedyIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <circle cx="6" cy="6" r="4.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="6" cy="6" r="4.5" />
      <path d="M3.5 8.5 Q6 6.5 8.5 8.5" strokeWidth="1.1" />
      <circle cx="4.2" cy="5" r="0.5" fill="currentColor" />
      <circle cx="7.8" cy="5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function TragicomedyIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round">
      <ellipse cx="4" cy="6" rx="3.2" ry="4" fill="currentColor" fillOpacity="0.15" />
      <ellipse cx="4" cy="6" rx="3.2" ry="4" />
      <path d="M2.2 7.8 Q4 9.4 5.8 7.8" strokeWidth="0.9" />
      <ellipse cx="8.2" cy="6.5" rx="2.8" ry="3.5" fill="currentColor" fillOpacity="0.2" />
      <ellipse cx="8.2" cy="6.5" rx="2.8" ry="3.5" />
      <path d="M6.5 8.8 Q8.2 7.2 9.9 8.8" strokeWidth="0.9" />
    </svg>
  );
}

function RomanceIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 10.5 C6 10.5 1 7 1 4 C1 2.5 2.2 1.5 3.5 1.5 C4.5 1.5 5.4 2.1 6 3 C6.6 2.1 7.5 1.5 8.5 1.5 C9.8 1.5 11 2.5 11 4 C11 7 6 10.5 6 10.5Z" fillOpacity="0.85" />
    </svg>
  );
}

function ThrillerIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <polygon points="7,1 4.5,6.5 6.5,6.5 5,11 9.5,5 7,5" fillOpacity="0.85" />
    </svg>
  );
}

function HorrorIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <ellipse cx="6" cy="5.5" rx="4.5" ry="4" fillOpacity="0.2" />
      <ellipse cx="6" cy="5.5" rx="4.5" ry="4" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="4" cy="5" r="1.1" />
      <circle cx="8" cy="5" r="1.1" />
      <path d="M3 8.5 L4 7.5 L5 8.5 L6 7.5 L7 8.5 L8 7.5 L9 8.5" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrimeIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
      <circle cx="5" cy="5" r="3.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="5" cy="5" r="3.5" />
      <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" strokeWidth="1.8" />
    </svg>
  );
}

function HistoricalIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="4.5" width="8" height="6" rx="0.6" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.9" fill="currentColor" />
      <path d="M2 4.5 C2 4.5 2 2.5 4 2.5 C4 2.5 4 4.5 6 4.5 C6 4.5 6 2.5 8 2.5 C8 2.5 10 2.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

function FantasyIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <polygon points="6,1 7,4.5 10.5,4.5 7.8,6.8 8.8,10.5 6,8.3 3.2,10.5 4.2,6.8 1.5,4.5 5,4.5" fillOpacity="0.85" />
    </svg>
  );
}

function SciFiIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
      <circle cx="6" cy="6" r="1.8" fill="currentColor" fillOpacity="0.4" />
      <ellipse cx="6" cy="6" rx="5" ry="2" />
      <ellipse cx="6" cy="6" rx="2" ry="5" />
    </svg>
  );
}

function ActionIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <path d="M1 6 L8 6 L8 3.5 L11 6 L8 8.5 L8 6" fillOpacity="0.85" />
    </svg>
  );
}

function SatireIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <circle cx="6" cy="5.5" r="4.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="6" cy="5.5" r="4.5" />
      <path d="M4 7.5 Q6 9 8 7.5" />
      <circle cx="4.5" cy="4.5" r="0.5" fill="currentColor" />
      <circle cx="7.5" cy="4.5" r="0.5" fill="currentColor" />
      <path d="M5.5 2 C5 1 3.5 1.5 4 2.8" strokeWidth="0.8" />
      <path d="M6.5 2 C7 1 8.5 1.5 8 2.8" strokeWidth="0.8" />
    </svg>
  );
}

function FarceIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <polygon points="6,1.5 6.9,4.2 9.8,4.2 7.5,6 8.4,8.7 6,7 3.6,8.7 4.5,6 2.2,4.2 5.1,4.2" fillOpacity="0.35" />
      <polygon points="6,1.5 6.9,4.2 9.8,4.2 7.5,6 8.4,8.7 6,7 3.6,8.7 4.5,6 2.2,4.2 5.1,4.2" fill="none" stroke="currentColor" strokeWidth="0.85" strokeLinejoin="round" />
      <line x1="6" y1="8.8" x2="6" y2="10.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function OtherIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <circle cx="2.5" cy="6" r="1.2" />
      <circle cx="6" cy="6" r="1.2" />
      <circle cx="9.5" cy="6" r="1.2" />
    </svg>
  );
}

// ─── Metadata maps ────────────────────────────────────────────────────────────

export const SCRIPT_TYPE_META: Record<string, { label: string; Icon: IconComp }> = {
  theater_play: { label: "Theater play",        Icon: TheaterPlayIcon },
  movie:        { label: "Movie",               Icon: MovieIcon },
  short_film:   { label: "Short film",          Icon: ShortFilmIcon },
  tv_episode:   { label: "TV episode",          Icon: TvEpisodeIcon },
  sitcom:       { label: "Sitcom",              Icon: SitcomIcon },
  musical:      { label: "Musical",             Icon: MusicalIcon },
  opera:        { label: "Opera",               Icon: OperaIcon },
  monologue:    { label: "Monologue",           Icon: MonologueIcon },
  radio_drama:  { label: "Radio / Audio drama", Icon: RadioDramaIcon },
};

export const CATEGORY_META: Record<string, { label: string; Icon: IconComp }> = {
  drama:       { label: "Drama",       Icon: DramaIcon },
  comedy:      { label: "Comedy",      Icon: ComedyIcon },
  tragedy:     { label: "Tragedy",     Icon: TragedyIcon },
  tragicomedy: { label: "Tragicomedy", Icon: TragicomedyIcon },
  romance:     { label: "Romance",     Icon: RomanceIcon },
  thriller:    { label: "Thriller",    Icon: ThrillerIcon },
  horror:      { label: "Horror",      Icon: HorrorIcon },
  crime:       { label: "Crime",       Icon: CrimeIcon },
  historical:  { label: "Historical",  Icon: HistoricalIcon },
  fantasy:     { label: "Fantasy",     Icon: FantasyIcon },
  sci_fi:      { label: "Sci-fi",      Icon: SciFiIcon },
  action:      { label: "Action",      Icon: ActionIcon },
  satire:      { label: "Satire",      Icon: SatireIcon },
  farce:       { label: "Farce",       Icon: FarceIcon },
  musical:     { label: "Musical",     Icon: MusicalIcon },
  other:       { label: "Other",       Icon: OtherIcon },
};

// ─── TypeTag pill ─────────────────────────────────────────────────────────────

function TypeTag({ icon: Icon, label }: { icon: IconComp; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: "var(--ink-faint)",
        border: "1px solid var(--rule)",
        padding: "1px 5px 1px 4px",
        borderRadius: 99,
        lineHeight: 1.6,
      }}
    >
      <Icon size={9} />
      {label}
    </span>
  );
}

function LangTag({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: "var(--ink-faint)",
        border: "1px solid var(--rule)",
        padding: "1px 5px",
        borderRadius: 99,
        lineHeight: 1.6,
      }}
    >
      {label}
    </span>
  );
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────

function ShimmerLine({ width = "100%", height = 12 }: { width?: string | number; height?: number }) {
  return (
    <div className="souffleur-shimmer" style={{ width, height, borderRadius: 3 }} />
  );
}

// ─── LibCard ─────────────────────────────────────────────────────────────────

export default function LibCard({ play, compact = false }: LibCardProps) {
  const t     = useTranslations("library");
  const tMeta = useTranslations("meta");
  const pad   = compact ? 16 : 20;

  const relativeDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t("lastPracticed") + " today";
    if (days === 1) return t("lastPracticed") + " yesterday";
    return `${t("lastPracticed")} ${days} days ago`;
  };

  const scriptTypeMeta = play.script_type ? SCRIPT_TYPE_META[play.script_type] : null;
  const categoryMeta   = play.play_type   ? CATEGORY_META[play.play_type]      : null;
  const scriptTypeLabel = play.script_type
    ? tMeta(`scriptType.${play.script_type}` as any)
    : null;
  const categoryLabel = play.play_type
    ? tMeta(`category.${play.play_type}` as any)
    : null;
  const langLabel = play.detected_language
    ? tMeta(`language.${play.detected_language}` as any)
    : null;

  const body = (() => {
    if (play.state === "processing") {
      return (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <ShimmerLine width="95%" height={11} />
            <ShimmerLine width="78%" height={11} />
          </div>
          <div style={{ marginTop: 4, height: 2, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
            <div className="souffleur-shimmer" style={{ height: "100%", width: "100%" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--ink-faint)" }}>
            <Sparkle size={10} color="var(--accent)" />
            <span style={{ fontFamily: "var(--font-mono)" }}>Analysing script…</span>
          </div>
        </div>
      );
    }

    if (play.state === "attention") {
      return (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink-muted)" }}>
            <Warn size={14} color="var(--accent)" />
            {t("attention")} {play.note}
          </div>
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" size="sm">{t("reviewEditor")}</Button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 14 }}>
        {play.description && (
          <div style={{ fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.55, marginBottom: 10, fontFamily: "var(--font-display)", fontStyle: "italic" }}>
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
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
            {play.off_book_pct ?? 0}{t("offBook")}
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
      {play.state === "processing" && (
        <div className="souffleur-shimmer" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2 }} />
      )}

      <div>
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: compact ? 17 : 19, fontWeight: 500, letterSpacing: -0.3, lineHeight: 1.2 }}>
            {play.title}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
            {play.is_monologue && <Badge tone="neutral">Monologue</Badge>}
            {play.state === "processing" && <Badge tone="accent">{t("processing")}</Badge>}
            {play.state === "attention"  && <Badge tone="neutral">{t("attentionBadge")}</Badge>}
          </div>
        </div>

        {/* Author */}
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 3 }}>{play.author}</div>

        {/* Metadata tags */}
        {(scriptTypeMeta || categoryMeta || langLabel) && (
          <div style={{ display: "flex", gap: 4, marginTop: 7, flexWrap: "wrap" }}>
            {scriptTypeMeta && scriptTypeLabel && <TypeTag icon={scriptTypeMeta.Icon} label={scriptTypeLabel} />}
            {categoryMeta   && categoryLabel   && <TypeTag icon={categoryMeta.Icon}   label={categoryLabel}   />}
            {langLabel      && <LangTag label={langLabel} />}
          </div>
        )}
      </div>

      {body}
    </Link>
  );
}
