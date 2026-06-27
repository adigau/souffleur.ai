import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ContentEntry } from "@/lib/script-types";

export interface PdfScene {
  id: string;
  act: string;
  scene: string;
  sort_order: number;
  title?: string | null;
  content: ContentEntry[];
}

export interface PdfCharacterProfile {
  gender?: string;
  age_range?: string;
  description?: string;
  has_dialogue?: boolean;
}

export interface ScriptPdfProps {
  playTitle: string;
  playAuthor?: string | null;
  summary?: string | null;
  description?: string | null;
  playType?: string | null;
  scriptType?: string | null;
  characterProfiles?: Record<string, PdfCharacterProfile> | null;
  scenes: PdfScene[];
  userRoles?: string[];
  sceneId?: string | null;
  cueMode?: boolean;
}

// ── Colour palette (mirrors the app's CSS variables) ──────────────────────────
const INK        = "#1a1917";
const INK_MUTED  = "#6b6460";
const INK_FAINT  = "#9b958e";
const RULE       = "#e8e4de";
const ACCENT     = "#7c6fcd";
const ACCENT_DARK= "#5a4fc0";
const COVER_BG   = "#18161a";  // very dark, slight purple tint
const COVER_TEXT = "#f0eef8";  // warm off-white on dark bg
const COVER_DIM  = "#8d87a8";  // muted text on dark bg
const HIGHLIGHT  = "#eeebfb";  // soft lavender for user lines

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  // ── Cover ──
  cover: {
    backgroundColor: COVER_BG,
    flexDirection: "column",
    height: "100%",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  // Thin accent stripe across the very top
  coverTopStripe: {
    height: 5,
    backgroundColor: ACCENT,
    width: "100%",
  },
  coverInner: {
    flex: 1,
    flexDirection: "column",
    paddingHorizontal: 64,
    paddingTop: 72,
    paddingBottom: 48,
  },

  // ── Cover title block ──
  coverTitleBlock: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  coverAccentLine: {
    width: 48,
    height: 3,
    backgroundColor: ACCENT,
    marginBottom: 20,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 48,
    color: COVER_TEXT,
    lineHeight: 1.1,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  coverAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coverAuthorLine: {
    width: 24,
    height: 1,
    backgroundColor: COVER_DIM,
  },
  coverAuthor: {
    fontFamily: "Helvetica",
    fontSize: 13,
    color: COVER_DIM,
    letterSpacing: 0.3,
  },

  // ── Cover divider ──
  coverDivider: {
    height: 0.5,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 28,
  },

  // ── Cover summary ──
  coverLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  coverSummary: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COVER_DIM,
    lineHeight: 1.65,
  },

  // ── Cover characters ──
  charTable: {
    flexDirection: "column",
    marginTop: 0,
  },
  charRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  charRowName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COVER_TEXT,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    width: "22%",
  },
  charRowMeta: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 8.5,
    color: COVER_DIM,
    width: "22%",
    paddingTop: 0.5,
  },
  charRowDesc: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "rgba(240,238,248,0.55)",
    flex: 1,
    lineHeight: 1.45,
  },

  // ── Cover footer ──
  coverFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  coverBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 0.5,
  },
  coverAiNote: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: "rgba(255,255,255,0.2)",
  },

  // ── Script page ──
  page: {
    backgroundColor: "#FAFAF8",
    paddingHorizontal: 60,
    paddingTop: 44,
    paddingBottom: 56,
  },

  // ── Single-scene header ──
  sceneOnlyHeader: {
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  sceneOnlyTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    color: INK,
    marginBottom: 4,
  },
  sceneOnlyAuthor: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: INK_MUTED,
  },
  sceneOnlySubtitle: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: INK_FAINT,
    marginTop: 7,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  // ── Scene section header ──
  sceneBlock: {
    flexDirection: "column",
    marginBottom: 16,
  },
  sceneActLabel: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: INK_FAINT,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  sceneTitle: {
    fontFamily: "Helvetica-BoldOblique",
    fontSize: 15,
    color: INK,
    marginBottom: 10,
  },
  sceneRule: {
    height: 0.75,
    backgroundColor: RULE,
    marginBottom: 0,
  },

  // ── Stage directions ──
  // scene_direction — location/time description (matches SceneOpen: italic, faint)
  sceneDirection: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 10,
    color: INK_FAINT,
    lineHeight: 1.55,
    marginVertical: 8,
  },
  // action / direction — parenthetical (matches ActionStage: italic, faint)
  actionDirection: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 10,
    color: INK_FAINT,
    lineHeight: 1.55,
    marginVertical: 8,
  },

  // ── Character + dialogue block ──
  dialogueBlock: {
    flexDirection: "column",
    marginBottom: 14,
  },
  dialogueBlockHighlighted: {
    flexDirection: "column",
    marginBottom: 14,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: HIGHLIGHT,
    borderLeftWidth: 2.5,
    borderLeftColor: ACCENT,
    borderRadius: 2,
  },
  // Character name — matches app: mono, 13px, bold, caps, muted accent
  charName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: INK_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  charNameHighlighted: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  // Dialogue — matches app: display font, 18px → 11pt in print, 1.6 line height
  dialogue: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: INK,
    lineHeight: 1.6,
  },
  // Inline stage direction within a line (entry.direction field)
  inlineDirection: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 9.5,
    color: INK_FAINT,
  },
  // Cue mode placeholder
  cueLine: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "rgba(0,0,0,0.12)",
    letterSpacing: 4,
  },

  // ── Page footer (fixed) ──
  footer: {
    position: "absolute",
    bottom: 22,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 8,
  },
  footerBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: ACCENT,
    letterSpacing: 0.4,
  },
  footerPage: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: INK_FAINT,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function entryText(entry: ContentEntry): string {
  if (entry.segments) {
    return entry.segments.map((seg) => seg.text ?? "").join("").replace(/\s+/g, " ").trim();
  }
  return entry.text ?? "";
}

function formatMeta(p: PdfCharacterProfile): string {
  return [p.gender, p.age_range?.replace(/_/g, " ")].filter(Boolean).join(", ");
}

function isUserRole(ch: string, userRoles: string[]): boolean {
  return userRoles.some((r) => r.toLowerCase() === ch.toLowerCase());
}

// ── Cover page ────────────────────────────────────────────────────────────────

function CoverPage({ playTitle, playAuthor, summary, description, characterProfiles }: Pick<ScriptPdfProps, "playTitle" | "playAuthor" | "summary" | "description" | "characterProfiles">) {
  const hasAnalysis = !!(summary || description);
  const speakingChars = characterProfiles
    ? Object.entries(characterProfiles).filter(([, p]) => p.has_dialogue !== false).slice(0, 9)
    : [];
  const bodyText = summary || description;

  return (
    <Page size="A4" style={s.cover}>
      {/* Accent stripe */}
      <View style={s.coverTopStripe} />

      <View style={s.coverInner}>
        {/* Title block — takes up remaining vertical space proportionally */}
        <View style={s.coverTitleBlock}>
          <View style={s.coverAccentLine} />
          <Text style={s.coverTitle}>{playTitle}</Text>
          {playAuthor && (
            <View style={s.coverAuthorRow}>
              <View style={s.coverAuthorLine} />
              <Text style={s.coverAuthor}>{playAuthor}</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        {bodyText && (
          <>
            <View style={s.coverDivider} />
            <Text style={s.coverLabel}>Summary</Text>
            <Text style={s.coverSummary}>{bodyText}</Text>
          </>
        )}

        {/* Characters */}
        {speakingChars.length > 0 && (
          <>
            <View style={[s.coverDivider, bodyText ? { marginTop: 24 } : {}]} />
            <Text style={s.coverLabel}>Characters</Text>
            <View style={s.charTable}>
              {speakingChars.map(([name, p]) => (
                <View key={name} style={s.charRow}>
                  <Text style={s.charRowName}>{name}</Text>
                  <Text style={s.charRowMeta}>{formatMeta(p)}</Text>
                  {p.description && <Text style={s.charRowDesc}>{p.description}</Text>}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={[s.coverFooter, { marginTop: 28 }]}>
          <Text style={s.coverBrand}>Souffleur.ai</Text>
          {hasAnalysis && <Text style={s.coverAiNote}>Play analysis generated with AI assistance</Text>}
        </View>
      </View>
    </Page>
  );
}

// ── Scene section ─────────────────────────────────────────────────────────────

function SceneSection({ scene, userRoles, isFirst, cueMode }: {
  scene: PdfScene;
  userRoles: string[];
  isFirst: boolean;
  cueMode: boolean;
}) {
  const label = scene.title?.replace(/^Scene\s+\d+\s*:\s*/i, "") ?? null;
  const actLabel = (scene.act && scene.act !== label) ? scene.act : null;
  const displayTitle = label || scene.act || `Scene ${scene.sort_order}`;

  return (
    <View style={{ marginTop: isFirst ? 0 : 32 }}>
      {/* Scene heading */}
      <View style={s.sceneBlock}>
        {actLabel && <Text style={s.sceneActLabel}>{actLabel}</Text>}
        <Text style={s.sceneTitle}>{displayTitle}</Text>
        <View style={s.sceneRule} />
      </View>

      {/* Content entries */}
      {scene.content.map((entry, i) => {
        const type = entry.type ?? "line";

        // Location/atmosphere description
        if (type === "scene_direction") {
          return <Text key={i} style={s.sceneDirection}>{entry.text ?? ""}</Text>;
        }

        // Parenthetical stage direction
        if (type === "action" || type === "direction") {
          return <Text key={i} style={s.actionDirection}>{`(${entry.text ?? ""})`}</Text>;
        }

        // Skip structural markers
        if (type !== "line") return null;

        const ch = entry.ch ?? "";
        const text = entryText(entry);
        if (!text && !ch) return null;

        const highlighted = ch ? isUserRole(ch, userRoles) : false;
        const hidden = highlighted && cueMode;

        return (
          <View key={i} style={highlighted ? s.dialogueBlockHighlighted : s.dialogueBlock} wrap={false}>
            {ch && (
              <Text style={highlighted ? s.charNameHighlighted : s.charName}>{ch}</Text>
            )}

            {/* Inline stage direction (entry.direction field — shown after char name on read page) */}
            {entry.direction && !hidden && (
              <Text style={s.inlineDirection}>{entry.direction}</Text>
            )}

            {hidden ? (
              <Text style={s.cueLine}>{"— — — — — — — — — — — — — — — — —"}</Text>
            ) : entry.segments ? (
              <Text style={s.dialogue}>
                {entry.segments.map((seg, si) =>
                  seg.action ? (
                    <Text key={si} style={s.inlineDirection}>{` (${seg.action}) `}</Text>
                  ) : (
                    <Text key={si}>{seg.text ?? ""}</Text>
                  )
                )}
              </Text>
            ) : (
              text && <Text style={s.dialogue}>{text}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Footer (fixed on every script page) ──────────────────────────────────────

function ScriptFooter() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerBrand}>Souffleur.ai</Text>
      <Text
        style={s.footerPage}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

export function ScriptPdf({
  playTitle,
  playAuthor,
  summary,
  description,
  characterProfiles,
  scenes,
  userRoles = [],
  sceneId,
  cueMode = false,
}: ScriptPdfProps) {
  const renderScenes = sceneId ? scenes.filter((sc) => sc.id === sceneId) : scenes;

  return (
    <Document
      title={playTitle}
      author={playAuthor ?? undefined}
      creator="Souffleur.ai"
      producer="Souffleur.ai"
    >
      {/* Cover (full play only) */}
      {!sceneId && (
        <CoverPage
          playTitle={playTitle}
          playAuthor={playAuthor}
          summary={summary}
          description={description}
          characterProfiles={characterProfiles}
        />
      )}

      {/* Script pages */}
      <Page size="A4" style={s.page}>
        {/* Single-scene mini-header */}
        {sceneId && (
          <View style={s.sceneOnlyHeader}>
            <Text style={s.sceneOnlyTitle}>{playTitle}</Text>
            {playAuthor && <Text style={s.sceneOnlyAuthor}>{playAuthor}</Text>}
            {renderScenes[0] && (
              <Text style={s.sceneOnlySubtitle}>
                {[
                  renderScenes[0].act,
                  renderScenes[0].title?.replace(/^Scene\s+\d+\s*:\s*/i, ""),
                ].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>
        )}

        {renderScenes.map((scene, i) => (
          <SceneSection
            key={scene.id}
            scene={scene}
            userRoles={userRoles}
            isFirst={i === 0 && !sceneId}
            cueMode={cueMode}
          />
        ))}

        <ScriptFooter />
      </Page>
    </Document>
  );
}
