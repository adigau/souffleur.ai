import type { ContentEntry } from "@/lib/script-types";

export interface PrintScene {
  id: string;
  act: string;
  scene: string;
  sort_order: number;
  title?: string | null;
  content: ContentEntry[];
}

export interface PrintCharacterProfile {
  gender?: string;
  age_range?: string;
  description?: string;
  has_dialogue?: boolean;
}

export interface PrintPlayData {
  title: string;
  author?: string | null;
  summary?: string | null;
  description?: string | null;
  playType?: string | null;
  scriptType?: string | null;
  detectedLanguage?: string | null;
  characterProfiles?: Record<string, PrintCharacterProfile> | null;
  scenes: PrintScene[];
  userRoles?: string[];
  sceneId?: string | null;
  sceneIds?: string[] | null;
  cueMode?: boolean;
  hideStage?: boolean;
}

// ── Character dot colours for the cast list ───────────────────────────────────
const CHAR_PALETTE = [
  "#c48a17", // saffron
  "#2a4878", // inkblue
  "#4a6b3a", // moss
  "#b24548", // rose
  "#7c6fcd", // purple
  "#6b655a", // muted
  "#2a6b78", // teal
  "#784a2a", // warm brown
];

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escCss(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function entryText(entry: ContentEntry): string {
  if (entry.segments) {
    return entry.segments.map((seg) => seg.text ?? "").join("").replace(/\s+/g, " ").trim();
  }
  return entry.text ?? "";
}

function isUserRole(ch: string, userRoles: string[]): boolean {
  return userRoles.some((r) => r.toLowerCase() === ch.toLowerCase());
}

function buildCharColorMap(scenes: PrintScene[]): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  for (const scene of scenes) {
    for (const entry of scene.content) {
      if (entry.type === "line" && entry.ch) {
        const key = entry.ch.toLowerCase();
        if (!map.has(key)) {
          map.set(key, CHAR_PALETTE[idx % CHAR_PALETTE.length]);
          idx++;
        }
      }
    }
  }
  return map;
}

// ── CSS — exact match of updated design ──────────────────────────────────────
const CSS = `
:root{
  --ink:#1a1814; --ink-muted:#6b655a; --ink-faint:#a8a193;
  --rule:#e5dfd0; --line:#ece5d3;
  --highlight:#ffe68c; --highlight-soft:#fff4c2;
  --saffron:#c48a17; --rose:#b24548; --inkblue:#2a4878; --moss:#4a6b3a;
  --serif:"Source Serif 4","Source Serif Pro",Georgia,serif;
  --sans:"Inter Tight","Inter",system-ui,sans-serif;
  --mono:"JetBrains Mono","IBM Plex Mono",ui-monospace,monospace;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#fff;}
body{font-family:var(--serif);color:var(--ink);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
::selection{background:var(--highlight);color:var(--ink);}

.doc{box-sizing:border-box;max-width:8.5in;margin:0 auto;background:#fff;padding:0 clamp(22px,5vw,0.9in);}
.doc-frame{width:100%;border-collapse:collapse;}
.doc-frame td{padding:0;}

/* Running header / footer — thead/tfoot repeat on every printed page automatically */
.run-head,.run-foot{display:flex;align-items:center;justify-content:space-between;
  font-family:var(--mono);font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-faint);}
.run-head{padding:0.42in 0 9px;border-bottom:1px solid var(--rule);}
.run-foot{padding:9px 0 0.42in;border-top:1px solid var(--rule);}
.run-head .rh-title{font-family:var(--serif);font-style:italic;font-size:11px;letter-spacing:0;text-transform:none;color:var(--ink-muted);}
.run-head .rh-brand,.run-foot .rf-brand{color:var(--saffron);letter-spacing:2px;}

/* Cover */
.cover{min-height:9.4in;display:flex;flex-direction:column;padding:0.55in 0 0.5in;break-after:page;}
.cover-top{display:flex;align-items:center;justify-content:space-between;}
.brand{display:inline-flex;align-items:center;gap:10px;}
.brand .mark{display:block;}
.brand .wm{font-family:var(--serif);font-weight:500;font-size:21px;letter-spacing:-0.3px;color:var(--ink);}
.brand .wm .co{color:var(--saffron);font-family:var(--sans);font-size:14px;font-weight:500;}
.cover-edition{font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-faint);text-align:right;}
.cover-mid{margin-top:auto;}
.cover-kicker{font-family:var(--mono);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--saffron);display:flex;align-items:center;gap:11px;margin-bottom:26px;}
.cover-kicker::before{content:"";width:26px;height:1.5px;background:var(--saffron);}
.cover-title{font-family:var(--serif);font-weight:500;font-size:78px;line-height:0.98;letter-spacing:-2.5px;margin:0;color:var(--ink);}
.cover-title .hl{background:linear-gradient(transparent 20%,var(--highlight-soft) 20%,var(--highlight-soft) 90%,transparent 90%);padding:0 4px;margin:0 -4px;box-shadow:inset 0 -0.3em 0 color-mix(in oklch,var(--highlight) 50%,transparent);}
.cover-title em{font-style:italic;font-weight:500;}
.cover-author{font-family:var(--serif);font-size:23px;font-style:italic;color:var(--ink-muted);margin:24px 0 0;}
.cover-scene-focus{font-family:var(--serif);font-size:15px;font-style:italic;color:var(--ink-muted);margin:18px 0 0;}
.cover-author b{font-style:normal;font-weight:500;color:var(--ink);}
.cover-rule{height:1px;background:var(--rule);margin:38px 0 22px;}
.cover-meta{display:flex;gap:34px;flex-wrap:wrap;}
.cover-meta .m{display:flex;flex-direction:column;gap:5px;}
.cover-meta .m-k{font-family:var(--mono);font-size:9.5px;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink-faint);}
.cover-meta .m-v{font-family:var(--serif);font-size:16px;color:var(--ink);}
.cover-foot{margin-top:auto;padding-top:46px;display:flex;justify-content:space-between;align-items:flex-end;font-family:var(--mono);font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-faint);}

/* Front matter */
.fm{padding-top:42px;}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--saffron);display:flex;align-items:center;gap:11px;margin:0 0 20px;}
.eyebrow::before{content:"";width:22px;height:1.5px;background:var(--saffron);}
.resume{font-family:var(--serif);font-size:18.5px;line-height:1.62;color:var(--ink);max-width:6.0in;margin:0 0 8px;text-wrap:pretty;}
.fm-divide{height:1px;background:var(--rule);margin:44px 0 40px;}
.cast{display:flex;flex-direction:column;gap:0;}
.cast-row{display:grid;grid-template-columns:2.3in 1fr;gap:22px;padding:20px 0;border-top:1px solid var(--rule);break-inside:avoid;}
.cast-row:last-child{border-bottom:1px solid var(--rule);}
.cast-row.cast-you{background:var(--highlight-soft);margin:0 -10px;padding:20px 10px;}
.cast-compact{display:grid;grid-template-columns:repeat(auto-fill,minmax(1.9in,1fr));border-bottom:1px solid var(--rule);}
.cast-item{display:flex;flex-direction:column;gap:5px;padding:16px 14px 16px 0;border-top:1px solid var(--rule);break-inside:avoid;}
.cast-item.cast-you{background:var(--highlight-soft);margin:0 -10px;padding:16px 10px;}
.cast-id{display:flex;flex-direction:column;gap:6px;}
.cast-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex-shrink:0;}
.cast-name{font-family:var(--sans);font-weight:600;font-size:14px;letter-spacing:1.8px;text-transform:uppercase;color:var(--ink);overflow-wrap:break-word;min-width:0;}
.cast-tag{font-family:var(--mono);font-size:10.5px;letter-spacing:0.5px;color:var(--ink-faint);}
.cast-desc{font-family:var(--serif);font-size:15px;line-height:1.58;color:var(--ink-muted);margin:0;text-wrap:pretty;}
.cast-you-badge{font-family:var(--mono);font-size:8px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;background:var(--highlight);color:var(--ink);padding:2px 5px;border-radius:2px;vertical-align:middle;margin-left:7px;}

/* Scene / script */
.scene-head{padding-top:54px;break-after:avoid;}
.scene-kicker{font-family:var(--mono);font-size:10.5px;letter-spacing:3px;text-transform:uppercase;color:var(--saffron);margin:0 0 8px;}
.scene-title{font-family:var(--serif);font-weight:500;font-size:42px;letter-spacing:-1px;color:var(--ink);margin:0;}
.decor{margin:26px 0 30px;padding:20px 22px;border-top:2px solid var(--saffron);border-bottom:1px solid var(--rule);break-inside:avoid;}
.decor-label{font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--saffron);display:block;margin-bottom:9px;}
.decor-text{font-family:var(--serif);font-style:italic;font-size:15.5px;line-height:1.6;color:var(--ink-muted);margin:0;text-wrap:pretty;}

.speech{margin:0 0 22px;}
.speech-you{background:var(--highlight-soft);margin-left:-8px;margin-right:-8px;padding:4px 8px;border-radius:2px;}
.cue{margin:0 0 4px;break-after:avoid;display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;}
.cue .who{font-family:var(--sans);font-weight:600;font-size:11.5px;letter-spacing:1.9px;text-transform:uppercase;color:var(--saffron);position:relative;}
.cue .pdir{font-family:var(--serif);font-style:italic;font-size:13.5px;color:var(--ink-muted);}
.line{font-family:var(--serif);font-size:15.5px;line-height:1.62;color:var(--ink);margin:0;max-width:6.4in;text-wrap:pretty;}
.line .indir{font-style:italic;color:var(--ink-muted);}
.line-cue{font-family:var(--serif);font-size:15.5px;line-height:1.62;color:rgba(26,24,20,0.14);letter-spacing:0.1em;margin:0;}

/* Stage directions — italic, parenthetical, same spacing as dialogue blocks */
.stage{font-family:var(--serif);font-style:italic;font-size:14px;line-height:1.56;color:var(--ink-muted);margin:0 0 22px;max-width:6.2in;text-wrap:pretty;break-inside:avoid;}
.break-orn{text-align:center;color:var(--saffron);font-size:15px;letter-spacing:2px;margin:30px 0;}

.colophon{margin-top:54px;padding-top:20px;border-top:1px solid var(--rule);font-family:var(--mono);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-faint);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;}

h1,h2,h3{text-wrap:balance;}

a{color:inherit;text-decoration:none;}
a:hover{text-decoration:underline;}

@page{size:letter;margin:0 0 0.38in 0;}
@media print{
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  html,body{margin:0;padding:0;}
  .doc{max-width:none!important;margin:0!important;padding:0 0.9in!important;}
  h1{break-before:page;}
  .cover h1{break-before:avoid;}
  h1,h2,h3,h4{break-after:avoid;}
  .scene-head{break-before:page;padding-top:0.42in;}
  .decor,.cast-row,.cast-item,.speech,.speech-you,.stage,blockquote{break-inside:avoid;}
  .cue{break-after:avoid;}
  .line,.cast-desc,.resume{orphans:3;widows:3;}
  .run-head{margin-bottom:0.3in;}
  tfoot{display:none;}
}
@media screen{
  .doc{padding-bottom:80px;}
  .cover{border-bottom:1px dashed var(--rule);}
}
`;

const BRAND_SVG = `<svg class="mark" width="30" height="30" viewBox="0 0 72 72" aria-hidden="true"><rect x="9" y="33" width="55" height="13" fill="#ffe68c" transform="rotate(-4 36 39)"/><text x="36" y="51" font-family="'Source Serif 4',Georgia,serif" font-style="italic" font-size="52" font-weight="600" fill="#1a1814" text-anchor="middle">S</text></svg>`;

// ── Cover title: split on natural line break, highlight last word ─────────────
function renderCoverTitle(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    const last = words.pop()!;
    const rest = words.join(" ");
    return rest
      ? `${esc(rest)}<br><span class="hl">${esc(last)}</span>`
      : `<span class="hl">${esc(last)}</span>`;
  }
  // Split roughly in half, highlight last word
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2words = words.slice(mid);
  const last = line2words.pop()!;
  const line2 = line2words.length ? `${line2words.join(" ")} <span class="hl">${esc(last)}</span>` : `<span class="hl">${esc(last)}</span>`;
  return `${esc(line1)}<br>${line2}`;
}

// Map raw AI-generated values to clean French display strings
const PLAY_TYPE_FR: Record<string, string> = {
  theater_play: "Pièce de théâtre",
  play: "Pièce de théâtre",
  comedy: "Comédie",
  drama: "Drame",
  tragedy: "Tragédie",
  tragicomedy: "Tragi-comédie",
  musical: "Comédie musicale",
  monologue: "Monologue",
  one_act_play: "Pièce en un acte",
  two_act_play: "Pièce en deux actes",
  farce: "Farce",
  vaudeville: "Vaudeville",
};

const AGE_RANGE_FR: Record<string, string> = {
  child: "enfant",
  teen: "adolescent·e",
  teenager: "adolescent·e",
  young_adult: "jeune adulte",
  adult: "adulte",
  middle_aged: "d'âge mûr",
  elderly: "sénior",
  old: "sénior",
};

function sanitizeLabel(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, "_");
  return PLAY_TYPE_FR[lower] ?? raw;
}

function buildKicker(playType: string | null | undefined, scriptType: string | null | undefined): string {
  const parts = [playType, scriptType]
    .filter(Boolean)
    .map((v) => sanitizeLabel(v!));
  return parts.join(" · ") || "Pièce de théâtre";
}

function displayLanguage(lang: string | null | undefined): string {
  const map: Record<string, string> = {
    fr: "Français", en: "English", es: "Español", de: "Deutsch",
    it: "Italiano", pt: "Português", nl: "Nederlands",
  };
  return map[lang ?? ""] ?? lang ?? "—";
}

function charMeta(p: PrintCharacterProfile): string {
  const gender = p.gender === "male" ? "Homme" : p.gender === "female" ? "Femme" : p.gender;
  const age = p.age_range
    ? (AGE_RANGE_FR[p.age_range.toLowerCase()] ?? p.age_range.replace(/_/g, " "))
    : undefined;
  return [gender, age].filter(Boolean).join(" · ");
}

function renderLineContent(entry: ContentEntry, isCue: boolean, hideStage: boolean): string {
  if (entry.segments && entry.segments.length > 0) {
    const hasText = entry.segments.some((seg) => !seg.action && (seg.text ?? "").trim());
    if (isCue && hasText) {
      const actionPart = hideStage ? "" : entry.segments
        .filter((seg) => seg.action)
        .map((seg) => `<em class="indir"> (${esc(seg.action!)}) </em>`)
        .join("");
      return `${actionPart ? `<p class="line">${actionPart}</p>` : ""}<p class="line-cue">— — — — — — — — — — — — — — — —</p>`;
    }
    const inner = entry.segments.map((seg) => {
      if (seg.action) return hideStage ? "" : `<em class="indir"> (${esc(seg.action)}) </em>`;
      return esc(seg.text ?? "");
    }).join("");
    return `<p class="line">${inner}</p>`;
  }
  if (isCue && (entry.text ?? "").trim()) {
    return `<p class="line-cue">— — — — — — — — — — — — — — — —</p>`;
  }
  return `<p class="line">${esc(entry.text ?? "")}</p>`;
}

function renderScene(
  scene: PrintScene,
  charColorMap: Map<string, string>,
  userRoles: string[],
  cueMode: boolean,
  hideStage: boolean,
): string {
  const parts: string[] = [];
  const kicker = scene.act || null;
  const mainTitle = scene.title?.replace(/^Scene\s+\d+\s*:\s*/i, "") || scene.scene || scene.act || String(scene.sort_order);

  parts.push(`
    <div class="scene-head">
      ${kicker && kicker !== mainTitle ? `<p class="scene-kicker">${esc(kicker)}</p>` : ""}
      <h2 class="scene-title">${esc(mainTitle)}</h2>
    </div>`);

  let decorShown = false;
  const content = scene.content;
  let i = 0;

  while (i < content.length) {
    const entry = content[i];
    const type = entry.type ?? "line";

    if (type === "scene_direction") {
      if (!hideStage) {
        if (!decorShown) {
          decorShown = true;
          parts.push(`
    <div class="decor">
      <span class="decor-label">Décor</span>
      <p class="decor-text">${esc(entry.text ?? "")}</p>
    </div>`);
        } else {
          parts.push(`<p class="stage">${esc(entry.text ?? "")}</p>`);
        }
      }
      i++;
      continue;
    }

    if (type === "action" || type === "direction") {
      if (!hideStage) parts.push(`<p class="stage">(${esc(entry.text ?? "")})</p>`);
      i++;
      continue;
    }

    if (type !== "line") { i++; continue; }

    const ch = entry.ch ?? "";
    if (!ch && !entryText(entry)) { i++; continue; }

    // Collect consecutive entries from the same character into one speech block.
    const group: ContentEntry[] = [entry];
    let j = i + 1;
    while (j < content.length) {
      const next = content[j];
      if ((next.type ?? "line") === "line" && next.ch === ch) {
        group.push(next);
        j++;
      } else {
        break;
      }
    }
    i = j;

    const youLine = ch ? isUserRole(ch, userRoles) : false;
    const isCueMode = youLine && cueMode;
    const speechClass = youLine ? "speech speech-you" : "speech";
    const firstDirHtml = group[0].direction ? ` <span class="pdir">${esc(group[0].direction)}</span>` : "";

    const bodyHtml = group.map((e) => renderLineContent(e, isCueMode, hideStage)).join("\n");

    parts.push(`
    <div class="${speechClass}">
      <p class="cue"><span class="who">${esc(ch)}</span>${firstDirHtml}</p>
      ${bodyHtml}
    </div>`);
  }

  return parts.join("\n");
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generatePlayPrintHtml(data: PrintPlayData): string {
  const {
    title,
    author,
    summary,
    description,
    playType,
    scriptType,
    detectedLanguage,
    characterProfiles,
    scenes,
    userRoles = [],
    sceneId,
    sceneIds,
    cueMode = false,
    hideStage = false,
  } = data;

  const renderScenes = sceneId
    ? scenes.filter((s) => s.id === sceneId)
    : sceneIds?.length
      ? scenes.filter((s) => sceneIds.includes(s.id))
      : scenes;
  const charColorMap = buildCharColorMap(scenes);
  const bodyText = summary || description;

  // When printing a single scene, scope characters and line count to that scene only.
  const charsWithLines = new Set(
    renderScenes.flatMap(s => s.content
      .filter(e => e.type === "line" && e.ch)
      .map(e => e.ch!.toLowerCase())
    )
  );
  const speakingChars = characterProfiles
    ? Object.entries(characterProfiles).filter(([name]) => charsWithLines.has(name.toLowerCase()))
    : [];

  const sceneLabel = renderScenes.length === 1
    ? renderScenes[0].title?.replace(/^Scene\s+\d+\s*:\s*/i, "") || `Scène ${renderScenes[0].sort_order}`
    : `${renderScenes.length} scènes`;

  const kicker = buildKicker(playType, scriptType);
  const totalLines = renderScenes.reduce((n, s) => n + s.content.filter(e => e.type === "line").length, 0);

  const SITE = `<a href="https://souffleur.co" target="_blank" rel="noopener">souffleur.co</a>`;

  // Running head/foot content
  const runHead = `<span class="rh-brand">${SITE}</span><span class="rh-title">${esc(title)}${author ? ` &nbsp;·&nbsp; ${esc(author)}` : ""}</span>`;
  const runFoot = `<span>${esc(title)} &nbsp;·&nbsp; ${esc(sceneLabel)}</span><span class="rf-brand">${SITE}</span>`;

  // @page margin-box footer: title · scene | souffleur.co | N / M
  // counter(page) only works reliably in @page margin boxes (not in tfoot or position:fixed).
  // Values are embedded as CSS string literals at generation time.
  const footerPageCss = `@page{`
    + `@bottom-left{content:"${escCss(title)} · ${escCss(sceneLabel)}";`
    + `font-family:"JetBrains Mono","IBM Plex Mono",monospace;`
    + `font-size:7pt;color:#a8a193;letter-spacing:.12em;text-transform:uppercase;`
    + `border-top:1px solid #e5dfd0;vertical-align:top;padding-top:8px;padding-left:.9in;}`
    + `@bottom-center{content:"souffleur.co";`
    + `font-family:"JetBrains Mono","IBM Plex Mono",monospace;`
    + `font-size:7pt;color:#c48a17;letter-spacing:2px;text-transform:uppercase;`
    + `border-top:1px solid #e5dfd0;vertical-align:top;padding-top:8px;}`
    + `@bottom-right{content:counter(page) " / " counter(pages);`
    + `font-family:"JetBrains Mono","IBM Plex Mono",monospace;`
    + `font-size:7pt;color:#a8a193;letter-spacing:.12em;`
    + `border-top:1px solid #e5dfd0;vertical-align:top;padding-top:8px;padding-right:.9in;}`
    + `}`;

  // Cover — always shown; single-scene prints indicate the focused scene.
  const coverHtml = `
  <section class="cover" data-screen-label="Couverture">
    <div class="cover-top">
      <span class="brand">${BRAND_SVG}<span class="wm">souffleur<span class="co">.co</span></span></span>
      <span class="cover-edition">Édition de lecture<br>${sceneId ? "Extrait" : sceneIds?.length ? "Mes scènes" : "Texte intégral"}</span>
    </div>
    <div class="cover-mid">
      <div class="cover-kicker">${esc(kicker)}</div>
      <h1 class="cover-title">${renderCoverTitle(title)}</h1>
      ${author ? `<p class="cover-author">de <b>${esc(author)}</b></p>` : ""}
      <div class="cover-rule"></div>
      <div class="cover-meta">
        ${scriptType ? `<div class="m"><span class="m-k">Format</span><span class="m-v">${esc(sanitizeLabel(scriptType))}</span></div>` : ""}
        ${playType ? `<div class="m"><span class="m-k">Genre</span><span class="m-v">${esc(sanitizeLabel(playType))}</span></div>` : ""}
        ${detectedLanguage ? `<div class="m"><span class="m-k">Langue</span><span class="m-v">${esc(displayLanguage(detectedLanguage))}</span></div>` : ""}
        ${speakingChars.length > 0 ? `<div class="m"><span class="m-k">Distribution</span><span class="m-v">${speakingChars.length} personnage${speakingChars.length !== 1 ? "s" : ""}</span></div>` : ""}
        ${totalLines > 0 ? `<div class="m"><span class="m-k">Répliques</span><span class="m-v">${totalLines}</span></div>` : ""}
      </div>
      ${sceneId ? `<p class="cover-scene-focus">Extrait de la pièce, ${esc(sceneLabel)}</p>` : sceneIds?.length ? `<p class="cover-scene-focus">Mes scènes uniquement — ${sceneIds.length} scène${sceneIds.length !== 1 ? "s" : ""} sur ${scenes.length}</p>` : ""}
    </div>
    <div class="cover-foot">
      <span>Généré par <a href="https://souffleur.co" target="_blank" rel="noopener">SOUFFLEUR.co</a>, le prompteur numérique</span>
      <a href="https://souffleur.co" target="_blank" rel="noopener">souffleur.co</a>
    </div>
  </section>`;

  // Front matter
  const anyHasDescription = speakingChars.some(([, p]) => !!p.description);

  let frontMatterHtml: string;
  if (sceneId || (!bodyText && speakingChars.length === 0 && !sceneIds?.length)) {
    frontMatterHtml = "";
  } else {
    const castHtml = (() => {
      if (speakingChars.length === 0) return "";
      // User's characters first, then the rest in original order.
      const orderedChars = [
        ...speakingChars.filter(([name]) => isUserRole(name, userRoles)),
        ...speakingChars.filter(([name]) => !isUserRole(name, userRoles)),
      ];
      if (anyHasDescription) {
        const rows = orderedChars.map(([name, p]) => {
          const isYou = isUserRole(name, userRoles);
          const dotColor = charColorMap.get(name.toLowerCase()) ?? "#6b655a";
          const meta = charMeta(p);
          return `
          <div class="cast-row${isYou ? " cast-you" : ""}">
            <div class="cast-id">
              <span class="cast-dot" style="background:${dotColor}"></span>
              <span class="cast-name" style="${isYou ? `color:${dotColor};` : ""}">${esc(name)}${isYou ? `<span class="cast-you-badge">Vous</span>` : ""}</span>
              ${meta ? `<span class="cast-tag">${esc(meta)}</span>` : ""}
            </div>
            ${p.description ? `<p class="cast-desc">${esc(p.description)}</p>` : ""}
          </div>`;
        }).join("\n");
        return `<div class="eyebrow">Personnages</div><div class="cast">${rows}</div>`;
      } else {
        const items = orderedChars.map(([name, p]) => {
          const isYou = isUserRole(name, userRoles);
          const dotColor = charColorMap.get(name.toLowerCase()) ?? "#6b655a";
          const meta = charMeta(p);
          return `
          <div class="cast-item${isYou ? " cast-you" : ""}">
            <span class="cast-dot" style="background:${dotColor}"></span>
            <span class="cast-name" style="${isYou ? `color:${dotColor};` : ""}">${esc(name)}${isYou ? `<span class="cast-you-badge">Vous</span>` : ""}</span>
            ${meta ? `<span class="cast-tag">${esc(meta)}</span>` : ""}
          </div>`;
        }).join("\n");
        return `<div class="eyebrow">Personnages</div><div class="cast cast-compact">${items}</div>`;
      }
    })();
    frontMatterHtml = `
      <section class="fm" data-screen-label="Résumé &amp; personnages">
        ${bodyText ? `<div class="eyebrow">Résumé</div><p class="resume">${esc(bodyText)}</p><div class="fm-divide"></div>` : ""}
        ${castHtml}
      </section>`;
  }

  // Script sections
  const scriptHtml = renderScenes.map((scene, i) => `
      <section class="script" data-screen-label="${esc(scene.title || scene.act || `Scène ${scene.sort_order}`)}">
        ${renderScene(scene, charColorMap, userRoles, cueMode, hideStage)}
        ${i < renderScenes.length - 1
          ? `<div class="break-orn" aria-hidden="true">·&ensp;·&ensp;·</div>`
          : `<div class="colophon"><span>Fin ${renderScenes.length === 1 ? "de la scène" : "de la pièce"}</span><span>Généré par <a href="https://souffleur.co" target="_blank" rel="noopener">Souffleur.co</a></span></div>`
        }
      </section>`).join("\n");

  return `<!DOCTYPE html>
<html lang="${detectedLanguage === "en" ? "en" : "fr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}${author ? ` — ${esc(author)}` : ""}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
<style>${footerPageCss}</style>
</head>
<body>
<main class="doc">

${coverHtml}

  <table class="doc-frame" role="presentation">
    <thead><tr><td>
      <div class="run-head">${runHead}</div>
    </td></tr></thead>

    <tbody><tr><td>
${frontMatterHtml}
${scriptHtml}
    </td></tr></tbody>

    <tfoot><tr><td>
      <div class="run-foot">${runFoot}</div>
    </td></tr></tfoot>
  </table>

</main>
<script>document.fonts.ready.then(function(){window.print();});</script>
</body>
</html>`;
}
