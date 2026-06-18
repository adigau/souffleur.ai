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
