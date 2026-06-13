import React from "react";

interface MonoTagProps {
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}

export default function MonoTag({ children, color, style }: MonoTagProps) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        color: color || "var(--ink-faint)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
