import AppIcon from "@/components/ui/AppIcon";
import Wordmark from "@/components/ui/Wordmark";
import Mark from "@/components/ui/Mark";

// Scene data — public domain Hamlet excerpt
const SCENE = [
  { ch: "OPHELIA", text: "Good my lord, how does your honour for this many a day?" },
  { ch: "HAMLET", text: "I humbly thank you; well, well, well.", you: true },
  { ch: "OPHELIA", text: "My lord, I have remembrances of yours that I have longed long to re-deliver." },
  { ch: "HAMLET", text: "No, not I; I never gave you aught.", you: true },
  { ch: "OPHELIA", text: "My honour'd lord, you know right well you did." },
  { ch: "HAMLET", text: "Ha, ha! are you honest?", you: true },
];

interface AuthAsideProps {
  foot?: React.ReactNode;
}

export default function AuthAside({ foot }: AuthAsideProps) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-elev)",
        borderRight: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        padding: "40px 48px",
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--line) 31px, var(--line) 32px)`,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "relative",
          zIndex: 2,
        }}
      >
        <AppIcon size={34} />
        <Wordmark size={20} />
      </div>

      {/* Script card */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: 392,
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: "26px 30px 28px",
            transform: "rotate(-1.4deg)",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 500,
                fontStyle: "italic",
                letterSpacing: -0.3,
              }}
            >
              Hamlet
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "var(--ink-faint)",
              }}
            >
              III.1 · 89
            </span>
          </div>

          {SCENE.slice(0, 6).map((line, i) => (
            <div key={i} style={{ marginBottom: 13 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  letterSpacing: 1.2,
                  color: line.you ? "var(--accent)" : "var(--ink-faint)",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                {line.ch}
                {line.you && " · you"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  color: "var(--ink)",
                }}
              >
                {line.you ? (
                  <Mark>{line.text}</Mark>
                ) : (
                  <span style={{ color: "var(--ink-muted)" }}>{line.text}</span>
                )}
              </div>
            </div>
          ))}

          {/* Marginalia note */}
          <div
            style={{
              position: "absolute",
              right: -18,
              top: 92,
              transform: "rotate(3deg)",
              background: "var(--highlight-soft)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 9px",
              maxWidth: 116,
              boxShadow: "var(--shadow-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              lineHeight: 1.45,
              color: "var(--ink)",
            }}
          >
            slow here — let it land
          </div>
        </div>
      </div>

      {/* Footer text */}
      {foot && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            fontSize: 12.5,
            color: "var(--ink-muted)",
            lineHeight: 1.55,
            maxWidth: 320,
          }}
        >
          {foot}
        </div>
      )}
    </div>
  );
}
