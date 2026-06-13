interface WordmarkProps {
  size?: number;
  showDotAi?: boolean;
}

export default function Wordmark({ size = 24, showDotAi = true }: WordmarkProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 2,
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 500,
        letterSpacing: -0.3,
        color: "var(--ink)",
        lineHeight: 1,
      }}
    >
      <span>souffleur</span>
      {showDotAi && (
        <span
          style={{
            color: "var(--accent)",
            fontSize: size * 0.7,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
          }}
        >
          .ai
        </span>
      )}
    </span>
  );
}
