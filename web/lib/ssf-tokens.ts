// Shared SSF syntax-colour map and stateful line classifier.
// Used by both ScriptEditor.tsx (via CodeMirror HighlightStyle) and
// the streaming preview renderer in EditShell.tsx.

export type SsfTokenType =
  | "comment"
  | "actHeader"
  | "sceneHeader"
  | "charName"
  | "direction"
  | "dialogue"
  | "divider";

export interface SsfLineStyle {
  color: string;
  fontStyle?: string;
  fontWeight?: string;
  fontFamily?: string;
  fontSize?: string;
  letterSpacing?: string;
}

export const SSF_TOKEN_STYLES: Record<SsfTokenType, SsfLineStyle> = {
  comment:     { color: "var(--ink-faint)",  fontStyle: "italic" },
  actHeader:   { color: "var(--accent)",     fontWeight: "700", letterSpacing: "0.04em" },
  sceneHeader: { color: "var(--accent)",     fontWeight: "500" },
  charName:    { color: "var(--inkblue)",    fontWeight: "600", fontFamily: "var(--font-mono)", fontSize: "0.85em" },
  direction:   { color: "var(--ink-muted)", fontStyle: "italic" },
  dialogue:    { color: "var(--ink)" },
  divider:     { color: "var(--ink-faint)" },
};

/**
 * Classify each line in an SSF document, tracking `inCharBlock` state across
 * lines — matching the stateful tokenizer in ScriptEditor's ssfStreamLanguage.
 */
export function classifySsfLines(text: string): Array<{ line: string; token: SsfTokenType }> {
  const result: Array<{ line: string; token: SsfTokenType }> = [];
  let inCharBlock = false;

  for (const line of text.split("\n")) {
    if (line.startsWith("//")) {
      result.push({ line, token: "comment" });
      inCharBlock = false;
      continue;
    }
    if (/^#(?!#)/.test(line)) {
      result.push({ line, token: "actHeader" });
      inCharBlock = false;
      continue;
    }
    if (/^##/.test(line)) {
      result.push({ line, token: "sceneHeader" });
      inCharBlock = false;
      continue;
    }
    if (/^---+$/.test(line)) {
      result.push({ line, token: "divider" });
      inCharBlock = false;
      continue;
    }
    if (line.startsWith("@")) {
      result.push({ line, token: "charName" });
      inCharBlock = true;
      continue;
    }
    if (line.startsWith("(")) {
      result.push({ line, token: "direction" });
      // Inline direction inside a char block keeps inCharBlock=true (matches CM tokenizer)
      continue;
    }
    result.push({ line, token: inCharBlock ? "dialogue" : "direction" });
  }

  return result;
}
