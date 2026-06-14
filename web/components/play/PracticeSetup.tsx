"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import MonoTag from "@/components/ui/MonoTag";
import Button from "@/components/ui/Button";
import { Mic, Check } from "@/components/ui/Icons";

const LADDER = [
  { n: 1, name: "Listen first", desc: "Your lines are performed too. Absorb the rhythm." },
  { n: 2, name: "Read along", desc: "Your line is shown in full. You deliver it." },
  { n: 3, name: "First letters", desc: "Only the first letter of each word." },
  { n: 4, name: "Off book", desc: "Nothing is shown. The real thing." },
];

interface Scene {
  id: string;
  act: string;
  scene: string;
  title?: string;
}

interface PracticeSetupProps {
  scenes: Scene[];
  userPlayId: string;
  initialSceneId?: string;
}

export default function PracticeSetup({ scenes, userPlayId, initialSceneId }: PracticeSetupProps) {
  const locale = useLocale();
  const router = useRouter();
  const [ladder, setLadder] = useState(2);
  const [selectedScene, setSelectedScene] = useState(
    (initialSceneId && scenes.find((s) => s.id === initialSceneId))
      ? initialSceneId
      : (scenes[0]?.id ?? "")
  );
  const [loop, setLoop] = useState(true);

  function begin() {
    const params = new URLSearchParams({
      scene: selectedScene,
      ladder: String(ladder),
      loop: String(loop),
    });
    router.push(`/app/plays/${userPlayId}/session?${params.toString()}`);
  }

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
        padding: "32px 16px 48px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: -0.5,
            }}
          >
            Run the scene
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
            Configure your practice session, then begin hands-free.
          </div>
        </div>

        {/* Scene picker */}
        {scenes.length > 1 && (
          <div>
            <MonoTag>Scene</MonoTag>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {scenes.map((s) => {
                const active = selectedScene === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScene(s.id)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      background: active ? "var(--ink)" : "var(--surface)",
                      color: active ? "var(--bg)" : "var(--ink-muted)",
                      border: `1px solid ${active ? "var(--ink)" : "var(--rule)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {s.title ? s.title.replace(/^Scene \d+:\s*/i, "").slice(0, 30) : `${s.act}.${s.scene}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ladder */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 12,
            }}
          >
            <MonoTag>The ladder</MonoTag>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {LADDER.map((s) => {
              const active = s.n === ladder;
              return (
                <button
                  key={s.n}
                  onClick={() => setLadder(s.n)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    borderRadius: "var(--radius-lg)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--rule)"}`,
                    background: active
                      ? "color-mix(in oklch, var(--accent) 8%, var(--surface))"
                      : "var(--surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: active ? "var(--accent)" : "var(--ink-faint)",
                      minWidth: 16,
                    }}
                  >
                    {s.n}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15,
                        fontWeight: 500,
                        color: "var(--ink)",
                      }}
                    >
                      {s.name}
                    </div>
                    {active && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 2 }}>
                        {s.desc}
                      </div>
                    )}
                  </div>
                  {active && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "var(--accent)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div
          style={{
            borderTop: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {[
            {
              id: "loop",
              name: "Loop the scene",
              desc: "Start over automatically at the end.",
              value: loop,
              set: setLoop,
            },
          ].map((o) => (
            <div
              key={o.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "14px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 2 }}>
                  {o.desc}
                </div>
              </div>
              <button
                onClick={() => o.set(!o.value)}
                style={{
                  width: 36,
                  height: 22,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: o.value ? "var(--accent)" : "var(--line)",
                  border: `1px solid ${o.value ? "var(--accent)" : "var(--rule)"}`,
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: o.value ? 16 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    transition: "left 0.15s",
                  }}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Begin */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Button size="lg" full onClick={begin}>
            <Mic size={15} color="var(--bg)" />
            Begin — hands-free
          </Button>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--ink-faint)",
              textAlign: "center",
              lineHeight: 1.55,
            }}
          >
            Souffleur hears your line and moves on automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
