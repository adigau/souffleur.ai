interface AppIconProps {
  size?: number;
}

export default function AppIcon({ size = 64 }: AppIconProps) {
  const r = size * 0.12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ borderRadius: r, display: "block" }}
    >
      <rect width="64" height="64" fill="#f7f3ec" />
      <rect x="0" y="0" width="64" height="64" fill="url(#p1)" />
      <defs>
        <pattern id="p1" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8h8" stroke="#e5dfd0" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect
        x="12"
        y="30"
        width="40"
        height="10"
        fill="#c48a17"
        opacity="0.35"
        transform="rotate(-4 32 35)"
      />
      <text
        x="32"
        y="44"
        fontFamily='"Source Serif 4", Georgia, serif'
        fontSize="42"
        fontWeight="500"
        textAnchor="middle"
        fill="#1a1814"
        fontStyle="italic"
      >
        S
      </text>
    </svg>
  );
}
