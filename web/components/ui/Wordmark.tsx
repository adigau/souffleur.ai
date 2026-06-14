interface WordmarkProps {
  size?: number;
  showDomain?: boolean;
}

export default function Wordmark({ size = 24, showDomain = true }: WordmarkProps) {
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
      {showDomain && (
        <span
          style={{
            color: "var(--accent)",
            fontSize: size * 0.7,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
          }}
        >
          .co
        </span>
      )}
    </span>
  );
}
