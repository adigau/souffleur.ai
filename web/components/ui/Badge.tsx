import React from "react";

type Tone = "neutral" | "accent" | "success";

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  style?: React.CSSProperties;
}

const toneStyles: Record<Tone, React.CSSProperties> = {
  neutral: { background: "var(--line)", color: "var(--ink-muted)" },
  accent: { background: "var(--accent-soft)", color: "var(--accent)" },
  success: {
    background: "color-mix(in oklch, var(--moss) 12%, var(--bg))",
    color: "var(--moss)",
  },
};

export default function Badge({ children, tone = "neutral", style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        letterSpacing: 0.2,
        ...toneStyles[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
