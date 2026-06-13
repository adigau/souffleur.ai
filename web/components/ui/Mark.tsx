import React from "react";

interface MarkProps {
  children: React.ReactNode;
  tone?: "highlight" | "accent";
}

export default function Mark({ children, tone = "highlight" }: MarkProps) {
  const bg = tone === "highlight" ? "var(--highlight-soft)" : "var(--accent-soft)";
  const shadow =
    tone === "highlight"
      ? "inset 0 -0.3em 0 color-mix(in oklch, var(--highlight) 40%, transparent)"
      : "inset 0 -0.3em 0 color-mix(in oklch, var(--accent) 40%, transparent)";
  return (
    <span
      style={{
        background: bg,
        padding: "0 2px",
        borderRadius: 2,
        boxShadow: shadow,
      }}
    >
      {children}
    </span>
  );
}
