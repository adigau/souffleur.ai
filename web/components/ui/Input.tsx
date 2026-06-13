"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export default function Input({ label, hint, style, ...props }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <div
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "var(--ink-muted)",
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          {label}
        </div>
      )}
      <input
        {...props}
        style={{
          height: 44,
          padding: "0 14px",
          background: "var(--surface)",
          color: "var(--ink)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-md)",
          fontSize: 15,
          fontFamily: "var(--font-body)",
          outline: "none",
          width: "100%",
          ...style,
        }}
      />
      {hint && (
        <div
          style={{
            fontSize: 11,
            color: "var(--ink-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
