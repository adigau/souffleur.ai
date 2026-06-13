// Souffleur icon set — inline SVGs matching the design system exactly

type IconProps = { size?: number; color?: string; className?: string };

export const Play = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 3v10l8-5-8-5z" fill={color} />
  </svg>
);

export const Pause = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="4" y="3" width="3" height="10" fill={color} />
    <rect x="9" y="3" width="3" height="10" fill={color} />
  </svg>
);

export const Mic = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="6" y="2" width="4" height="8" rx="2" stroke={color} strokeWidth="1.5" />
    <path d="M3.5 8a4.5 4.5 0 009 0M8 12.5V14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Book = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 2h4a2 2 0 012 2v10a2 2 0 00-2-2H3V2zM13 2H9a2 2 0 00-2 2v10a2 2 0 012-2h4V2z" stroke={color} strokeWidth="1.3" />
  </svg>
);

export const Check = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5l3 3 7-7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Search = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.5" />
    <path d="M10.5 10.5L14 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Plus = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const Settings = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke={color} strokeWidth="1.3" />
    <path d="M8 1.5v1.8M8 12.7v1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M1.5 8h1.8M12.7 8h1.8M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const ArrowRight = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Sparkle = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M8 6l1 1-1 1-1-1 1-1zM8 9l1 1-1 1-1-1 1-1z" fill={color} />
  </svg>
);

export const User = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="6" r="2.5" stroke={color} strokeWidth="1.4" />
    <path d="M3 13.5c.5-2.2 2.5-3.5 5-3.5s4.5 1.3 5 3.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const Flame = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2c0 3-3 4-3 7a3 3 0 006 0c0-1.5-1-2-1-3 0 0 1 0 2 1 0-2-1-3-2-5-.5 0-2 0-2 0z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

export const Sun = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.4" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const Moon = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M13.5 10A5.5 5.5 0 016 2.5a6 6 0 100 11 5.47 5.47 0 007.5-3.5z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Upload = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 10V2.5M5 5l3-3 3 3M3 10v2.5h10V10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Pencil = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 13l.8-3.2 7.4-7.4a1.2 1.2 0 011.7 0l.7.7a1.2 1.2 0 010 1.7L6.2 12.2 3 13z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export const Warn = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2.5L14.5 13H1.5L8 2.5z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M8 6.5V9.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="8" cy="11.4" r="0.8" fill={color} />
  </svg>
);

export const Chev = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const X = ({ size = 16, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Google = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" style={{ display: "block" }}>
    <path d="M16.51 8.18c0-.57-.05-1.11-.14-1.64H9v3.09h4.22c-.18.98-.73 1.81-1.56 2.37v1.97h2.52c1.47-1.36 2.33-3.36 2.33-5.79z" fill="#4285F4" />
    <path d="M9 16.5c2.1 0 3.87-.7 5.16-1.89l-2.52-1.97c-.7.47-1.6.75-2.64.75-2.03 0-3.75-1.37-4.36-3.22H2.04v2.03A7.5 7.5 0 009 16.5z" fill="#34A853" />
    <path d="M4.64 10.17A4.5 4.5 0 014.4 9c0-.41.07-.8.18-1.17V5.8H2.04A7.5 7.5 0 001.5 9c0 1.21.29 2.35.8 3.36l2.34-2.19z" fill="#FBBC05" />
    <path d="M9 4.58c1.14 0 2.17.39 2.97 1.16l2.23-2.23C12.87 2.24 11.1 1.5 9 1.5A7.5 7.5 0 002.04 5.8l2.6 2.03C5.25 5.95 6.97 4.58 9 4.58z" fill="#EA4335" />
  </svg>
);
