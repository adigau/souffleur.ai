"use client";

import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  full?: boolean;
  asChild?: boolean;
}

const sizes: Record<Size, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: 13, height: 28 },
  md: { padding: "9px 16px", fontSize: 14, height: 36 },
  lg: { padding: "12px 20px", fontSize: 15, height: 44 },
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "#fff",
    border: "1px solid transparent",
  },
  secondary: {
    background: "transparent",
    color: "var(--ink)",
    border: "1px solid var(--rule)",
  },
  ghost: {
    background: "transparent",
    color: "var(--ink)",
    border: "1px solid transparent",
  },
  soft: {
    background: "var(--accent-soft)",
    color: "var(--accent)",
    border: "1px solid transparent",
  },
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  full,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "opacity 0.15s ease",
        width: full ? "100%" : "auto",
        letterSpacing: 0,
        ...sizes[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
