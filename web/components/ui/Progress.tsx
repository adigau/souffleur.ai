interface ProgressProps {
  value: number;
  max?: number;
  height?: number;
}

export default function Progress({ value, max = 100, height = 6 }: ProgressProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div
      style={{
        height,
        width: "100%",
        background: "var(--line)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--accent)",
          borderRadius: 999,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}
