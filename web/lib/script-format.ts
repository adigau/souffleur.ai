/**
 * Souffleur Script Format (SSF) — parser and serializer
 *
 * Syntax reference:
 *   // comment              → stripped, not stored in JSONB
 *   opening text            → play_open (text before first # act marker)
 *   # Act I                 → act_open
 *   ## Scene 1: location    → scene_open (starts a new DB scene row)
 *   (stage direction)       → action
 *   ---                     → scene_close
 *   @CHARACTER (dir)        → starts a line entry; direction is optional
 *   dialogue text           → body of the preceding line; inline (action) → segments
 */

import type { ContentEntry, ParatextType } from "@/lib/script-types";

export interface SsfError {
  line: number; // 1-based
  message: string;
  severity: "error" | "warning";
}

export interface ParsedScene {
  act: string;
  scene: string;
  sort_order: number;
  title: string;
  content: ContentEntry[];
}

export interface ParseResult {
  scenes: ParsedScene[];
  errors: SsfError[];
}

// ─── Parser ──────────────────────────────────────────────────────────────────

export function parseSSF(text: string): ParseResult {
  const lines = text.split("\n");
  const errors: SsfError[] = [];

  // Accumulator state
  let currentAct = "";
  let currentScene = "";
  let sceneTitle = "";
  let sceneIndex = 0;
  let beforeFirstAct = true;
  let beforeFirstScene = true;
  let actNumber = 0;
  let sceneNumber = 0;
  let lastCh: string | null = null; // last character who spoke, for multi-line continuation
  let lastChList: string[] | null = null; // parallel to lastCh for multi-char lines

  const scenes: ParsedScene[] = [];
  let currentContent: ContentEntry[] = [];
  let pendingChar: string | null = null;
  let pendingCharList: string[] | null = null; // set for @DISPLAY:CHAR1+CHAR2 multi-char cues
  let pendingDirection: string | null = null;
  let pendingCharLine = 0;

  function flushPendingChar(lineNum: number) {
    if (pendingChar !== null) {
      errors.push({
        line: pendingCharLine,
        message: `La réplique ne contient aucun texte pour le personnage "${pendingChar}"`,
        severity: "error",
      });
      pendingChar = null;
      pendingCharList = null;
      pendingDirection = null;
    }
  }

  function pushScene() {
    if (currentContent.length > 0 || currentScene) {
      scenes.push({
        act: currentAct,
        scene: currentScene,
        sort_order: sceneIndex++,
        title: sceneTitle,
        content: currentContent,
      });
    }
    currentContent = [];
  }

  // Helper: split dialogue text into segments when inline `(action)` present.
  // A line that is entirely a parenthetical (no text around it) still needs
  // segments — it's a didascalie sitting alone inside a character's speech.
  function parseDialogueSegments(dialogueLine: string) {
    const segmentRe = /(\([^)]*\))/g;
    const parts = dialogueLine.split(segmentRe).filter((p) => p.length > 0);
    const hasAction = parts.some((p) => p.startsWith("(") && p.endsWith(")"));
    if (!hasAction) return null; // plain text, no didascalie — caller keeps raw text
    return parts
      .map((p) =>
        p.startsWith("(") && p.endsWith(")")
          ? { action: p.slice(1, -1).trim() }
          : { text: p.trim() }
      )
      .filter((seg) => !("text" in seg) || (seg as { text: string }).text.length > 0);
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNum = i + 1;
    const trimmed = raw.trim();

    // ── Comments ──────────────────────────────────────────────────────────
    if (trimmed.startsWith("//")) continue;

    // ── Blank lines ───────────────────────────────────────────────────────
    // Reset lastCh so a (direction) or new speaker after a blank line isn't
    // swallowed as continuation of the previous character's speech.
    if (trimmed === "") { lastCh = null; lastChList = null; continue; }

    // ── Act header: # Act I ───────────────────────────────────────────────
    if (/^#(?!#)/.test(trimmed)) {
      flushPendingChar(lineNum);
      lastCh = null; lastChList = null;
      if (!beforeFirstAct) pushScene();
      beforeFirstAct = false;
      beforeFirstScene = true;
      actNumber++;
      sceneNumber = 0;
      const actText = trimmed.replace(/^#+\s*/, "");
      currentAct = actText || `Act ${actNumber}`;
      currentScene = "";
      sceneTitle = "";
      currentContent.push({ type: "act_open" as ParatextType, text: currentAct });
      continue;
    }

    // ── Scene header: ## Scene 1 ──────────────────────────────────────────
    if (trimmed.startsWith("##")) {
      flushPendingChar(lineNum);
      lastCh = null; lastChList = null;
      if (!beforeFirstScene) pushScene();
      beforeFirstScene = false;
      sceneNumber++;
      const rawTitle = trimmed.replace(/^#+\s*/, "");
      sceneTitle = rawTitle || `Scene ${sceneNumber}`;
      // scene number is everything up to optional colon/dash
      const sceneMatch = sceneTitle.match(/^(?:Scene\s+)?([^:—–-]*)/i);
      currentScene = sceneMatch ? sceneMatch[1].trim() : sceneTitle;
      currentContent.push({ type: "scene_open" as ParatextType, text: sceneTitle });
      continue;
    }

    // ── Divider: --- ──────────────────────────────────────────────────────
    if (/^---+$/.test(trimmed)) {
      flushPendingChar(lineNum);
      lastCh = null; lastChList = null;
      currentContent.push({ type: "scene_close" as ParatextType });
      continue;
    }

    // ── Stage direction: (text) — only outside a character's dialogue.
    // Inside dialogue (pendingChar/lastCh set), a parenthetical-only line
    // before actual text is treated as a direction annotation on the pending
    // character cue; mixed or text-containing lines are handled below (rule 3).
    if (trimmed.startsWith("(") && trimmed.endsWith(")") && pendingChar === null && lastCh === null) {
      const dirText = trimmed.replace(/^\(|\)$/g, "").trim();
      // play_open only before the first act header; inside an act it's action
      const type: ParatextType = beforeFirstAct ? "play_open" : "action";
      currentContent.push({ type, text: dirText });
      continue;
    }

    // (direction) dialogue text — direction IS closed but followed by dialogue on same line.
    // Parse as scene_direction (whole line); no error.
    if (trimmed.startsWith("(") && trimmed.includes(")") && !trimmed.endsWith(")") && pendingChar === null && lastCh === null) {
      const type: ParatextType = beforeFirstAct ? "play_open" : "scene_direction";
      currentContent.push({ type, text: trimmed });
      continue;
    }

    // Truly unclosed parenthetical: starts with ( but never closes — flag as error.
    if (trimmed.startsWith("(") && !trimmed.includes(")") && pendingChar === null && lastCh === null) {
      errors.push({
        line: lineNum,
        message: "La didascalie doit s'ouvrir et se fermer sur la même ligne",
        severity: "error",
      });
      const dirText = trimmed.replace(/^\(/, "").trim();
      const type: ParatextType = beforeFirstAct ? "play_open" : "action";
      currentContent.push({ type, text: dirText });
      continue;
    }

    // ── Character line: @CHARACTER or @CHARACTER (direction) ──────────────
    if (trimmed.startsWith("@")) {
      flushPendingChar(lineNum);
      lastCh = null; lastChList = null;

      const charMatch = trimmed.match(/^@([^(]+?)(?:\s*(\(.*\)))?\s*$/);
      if (!charMatch || !charMatch[1].trim()) {
        errors.push({
          line: lineNum,
          message: "Le libellé du personnage est invalide — il doit contenir un nom après @",
          severity: "error",
        });
        pendingChar = null;
        pendingCharList = null;
        continue;
      }

      const rawCue = charMatch[1].trim();
      const colonIdx = rawCue.indexOf(":");
      if (colonIdx !== -1) {
        // @DISPLAY_LABEL:CHAR1+CHAR2 — multi-character line
        pendingChar = rawCue.slice(0, colonIdx).trim();
        pendingCharList = rawCue.slice(colonIdx + 1).split("+").map((c) => c.trim()).filter(Boolean);
      } else {
        pendingChar = rawCue;
        pendingCharList = null;
      }
      pendingDirection = charMatch[2] ?? null;
      pendingCharLine = lineNum;

      // Headings (#, ##) are optional — no warning for characters before them
      continue;
    }

    // ── Dialogue / plain text ─────────────────────────────────────────────
    if (pendingChar !== null) {
      const segments = parseDialogueSegments(trimmed);

      // Standalone parenthetical line before any dialogue text → emit as a
      // separate `action` stage-direction entry and keep waiting for text.
      // This handles:  @DAVID\n\n(à voix basse)\n\nY bougent pas.
      // It differs from @DAVID (à voix basse) on one line (captured by charMatch[2]).
      const isPureAction =
        trimmed.startsWith("(") &&
        trimmed.endsWith(")") &&
        segments !== null &&
        segments.every((s) => "action" in s);
      if (isPureAction) {
        const dirText = trimmed.replace(/^\(|\)$/g, "").trim();
        currentContent.push({ type: "action" as ParatextType, text: dirText });
        continue; // don't clear pendingChar — wait for the actual dialogue text
      }

      const entry: ContentEntry = {
        type: "line" as ParatextType,
        ch: pendingChar,
        ...(pendingCharList ? { chars: pendingCharList } : {}),
        ...(pendingDirection ? { direction: pendingDirection } : {}),
        ...(segments ? { segments } : { text: trimmed }),
      };
      currentContent.push(entry);
      lastCh = pendingChar;
      lastChList = pendingCharList;
      pendingChar = null;
      pendingCharList = null;
      pendingDirection = null;
      continue;
    }

    // ── Continuation of previous character's speech ───────────────────────
    if (lastCh !== null) {
      const segments = parseDialogueSegments(trimmed);
      currentContent.push({
        type: "line" as ParatextType,
        ch: lastCh,
        ...(lastChList ? { chars: lastChList } : {}),
        ...(segments ? { segments } : { text: trimmed }),
      });
      continue;
    }

    // ── Bare character name (no @ prefix) ────────────────────────────────
    // Short line with no trailing sentence punctuation, not a stage-direction
    // verb, inside a scene → treat as an implicit @CHARACTER cue so scripts
    // written in traditional play format (name on its own line) work without @.
    const bareNameWords = trimmed.split(/\s+/).length;
    const bareNameStageVerb = /^(enter|exit|exeunt|aside|re-enter|flourish|sennet|alarum)\b/i;
    if (
      !beforeFirstScene &&
      bareNameWords <= 3 &&
      trimmed.length <= 40 &&
      !/[.!?,;:]$/.test(trimmed) &&
      !bareNameStageVerb.test(trimmed)
    ) {
      flushPendingChar(lineNum);
      lastCh = null;
      pendingChar = trimmed;
      pendingCharLine = lineNum;
      continue;
    }

    // Plain text with no character context → play_open before first act,
    // scene_direction otherwise (bare text, no user-supplied parens).
    // Explicit (parenthetical) stage directions above use "action" type,
    // so the two render differently in the read view.
    if (beforeFirstAct) {
      currentContent.push({ type: "play_open" as ParatextType, text: trimmed });
    } else {
      currentContent.push({ type: "scene_direction" as ParatextType, text: trimmed });
    }
  }

  flushPendingChar(lines.length);
  pushScene();

  return { scenes, errors };
}

// ─── Serializer ───────────────────────────────────────────────────────────────

interface SceneInput {
  act: string;
  scene: string;
  sort_order: number;
  title?: string;
  content: ContentEntry[];
}

export function serializeSSF(scenes: SceneInput[]): string {
  const sorted = [...scenes].sort((a, b) => a.sort_order - b.sort_order);
  const lines: string[] = [];
  let lastAct = "";

  for (const scene of sorted) {
    // H1 heading (only when it changes, and only when non-empty)
    if (scene.act !== lastAct) {
      if (scene.act) {
        if (lines.length > 0) lines.push("");
        lines.push(`# ${scene.act}`);
      }
      lastAct = scene.act;
    }

    // H2 heading — only emit when the scene has a title
    const h2 = scene.title || (scene.scene ? `Scene ${scene.scene}` : "");
    if (h2) {
      lines.push("");
      lines.push(`## ${h2}`);
    }
    lines.push("");

    let lastSerialCh: string | null = null;

    for (const entry of scene.content) {
      const type = entry.type;

      if (type === "act_open") {
        continue; // act heading already emitted from scene.act
      }

      if (type === "play_open") {
        // Pre-heading prose bundled with the first scene in legacy DB rows.
        // Emit as plain text so content isn't silently dropped.
        lines.push(entry.text ?? "");
        lines.push("");
        continue;
      }

      if (type === "scene_open") {
        continue;
      }

      if (type === "scene_direction") {
        if (entry.text) {
          if (lastSerialCh !== null) { lines.push(""); lastSerialCh = null; }
          lines.push(entry.text); // bare text — no parens (user didn't write any)
          lines.push("");
        }
        continue;
      }

      if (type === "scene_close") {
        if (lastSerialCh !== null) { lines.push(""); lastSerialCh = null; }
        lines.push("---");
        lines.push("");
        continue;
      }

      if (type === "action" || type === "direction") {
        if (lastSerialCh !== null) { lines.push(""); lastSerialCh = null; }
        lines.push(`(${entry.text ?? ""})`);
        lines.push("");
        continue;
      }

      if (!type || type === "line") {
        const newCh = entry.ch ?? "?";
        const dir = entry.direction ? ` ${entry.direction}` : "";
        // Only emit @CH when the character changes (or when a cue direction is present)
        if (newCh !== lastSerialCh || dir) {
          if (lastSerialCh !== null) lines.push(""); // blank between different characters
          // Multi-character: @DISPLAY:CHAR1+CHAR2
          const cue = entry.chars && entry.chars.length > 0
            ? `@${newCh}:${entry.chars.join("+")}${dir}`
            : `@${newCh}${dir}`;
          lines.push(cue);
        }
        lastSerialCh = newCh;

        if (entry.segments && entry.segments.length > 0) {
          const text = entry.segments
            .map((s) => (s.action ? `(${s.action})` : (s.text ?? "").trim()))
            .filter(Boolean)
            .join(" ");
          lines.push(text);
        } else {
          lines.push(entry.text ?? "");
        }
        continue;
      }
    }

    // Trailing blank after last spoken line
    if (lastSerialCh !== null) lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
