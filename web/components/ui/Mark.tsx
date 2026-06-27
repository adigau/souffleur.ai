import React from "react";

interface MarkProps {
  children: React.ReactNode;
  tone?: "highlight" | "accent";
}

export default function Mark({ children, tone = "highlight" }: MarkProps) {
  // Gradient leaves 20% transparent at top so the fill doesn't bleed into the line above.
  // Both tones use the highlight (yellow) palette for visual consistency.
  const bg = tone === "accent"
    ? "linear-gradient(transparent 20%,color-mix(in oklch,var(--highlight) 55%,transparent) 20%,color-mix(in oklch,var(--highlight) 55%,transparent) 90%,transparent 90%)"
    : "linear-gradient(transparent 20%,var(--highlight-soft) 20%,var(--highlight-soft) 90%,transparent 90%)";
  const shadow = "inset 0 -0.3em 0 color-mix(in oklch, var(--highlight) 50%, transparent)";
  return (
    <span
      style={{
        background: bg,
        padding: "0 4px",
        margin: "0 -2px",
        boxShadow: shadow,
      }}
    >
      {children}
    </span>
  );
}
