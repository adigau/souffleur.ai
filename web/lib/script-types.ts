// Shared types for the Souffleur Script Format — no "use client", safe to import in server modules

export type ParatextType =
  | "play_open"
  | "act_open"
  | "scene_open"
  | "scene_direction"
  | "action"
  | "direction"
  | "scene_close"
  | "line";

export interface LineSegment {
  text?: string;
  action?: string;
}

export interface ContentEntry {
  type?: ParatextType;
  ch?: string;
  chars?: string[];  // actual character owners when multiple (e.g. ["PIERRE", "Clotilde"]); ch is the display label
  text?: string;
  segments?: LineSegment[];
  you?: boolean;
  direction?: string;
  intent?: string;
}

/** A user's play entry as it appears in the library. */
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

/** Returns only the spoken text, stripping inline stage directions. */
export function extractCleanSpeechText(entry: ContentEntry): string {
  if (entry.segments) {
    return entry.segments
      .filter((s) => !s.action)
      .map((s) => s.text ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return entry.text ?? "";
}
