"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import { X, Sparkle } from "@/components/ui/Icons";

function ArrowUp({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M3 7l4-4 4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getQuickActions(language: string | null | undefined, userRoles: string[], sceneTitle: string | null) {
  const isFr = language?.startsWith("fr");
  if (isFr) {
    return [
      userRoles.length > 0 ? "Parle moi de mon personnage" : "Parle moi des personnages",
      sceneTitle ? "Donne moi des idées d'émotions pour jouer cette scène" : "Donne moi des idées d'interprétation",
      sceneTitle ? "Quel est l'impact de cette scène sur le reste de la pièce ?" : "Explique moi la structure de la pièce",
    ];
  }
  return [
    userRoles.length > 0 ? "Tell me about my character" : "Tell me about the characters",
    sceneTitle ? "Give me emotion ideas for this scene" : "Give me interpretation ideas",
    sceneTitle ? "What's the impact of this scene on the rest of the play?" : "Explain the structure of the play",
  ];
}

function getPlaceholder(language: string | null | undefined, sceneTitle: string | null, userRoles: string[]) {
  const isFr = language?.startsWith("fr");
  if (isFr) {
    if (sceneTitle) return "Pose une question sur cette scène…";
    if (userRoles.length > 0) return "Pose une question sur ton personnage…";
    return "Pose une question à ton coach de théâtre…";
  }
  if (sceneTitle) return `Ask about ${sceneTitle}…`;
  if (userRoles.length > 0) return `Ask about playing ${userRoles.join(", ")}…`;
  return "Ask your theatre coach…";
}

export default function PlayChatPanel({
  userPlayId,
  currentSceneTitle,
  userRoles,
  language,
  onClose,
}: {
  userPlayId: string;
  currentSceneTitle: string | null;
  userRoles: string[];
  language?: string | null;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Ref so custom fetch always sends the latest scene title without re-creating the transport
  const sceneRef = useRef<string | null>(currentSceneTitle);
  useEffect(() => {
    sceneRef.current = currentSceneTitle;
  }, [currentSceneTitle]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/plays/${userPlayId}/chat`,
        body: { language },
        fetch: (url, init) => {
          const body = JSON.parse((init?.body as string) ?? "{}");
          body.currentSceneTitle = sceneRef.current;
          return globalThis.fetch(url, { ...init, body: JSON.stringify(body) });
        },
      }),
    [userPlayId, language]
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isStreaming = status === "streaming" || status === "submitted";
  const isFr = language?.startsWith("fr");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSend(text?: string) {
    const t = (text ?? input).trim();
    if (!t || isStreaming) return;
    setInput("");
    sendMessage({ text: t });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const quickActions = getQuickActions(language, userRoles, currentSceneTitle);
  const placeholder = getPlaceholder(language, currentSceneTitle, userRoles);

  return (
    <div style={{
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      height: 360,
      zIndex: 30,
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-elev)",
      borderTop: "1px solid var(--rule)",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
    }}>
      {/* Header */}
      <div style={{
        height: 44,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        borderBottom: "1px solid var(--rule)",
        gap: 8,
      }}>
        <Sparkle size={13} color="var(--accent)" />
        <span style={{
          flex: 1,
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          fontWeight: 600,
          color: "var(--ink)",
        }}>
          {isFr ? "Coach de théâtre" : "Theatre coach"}
        </span>
        {currentSceneTitle && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9.5,
            color: "var(--ink-faint)", letterSpacing: 0.3,
            maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {currentSceneTitle}
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-faint)", padding: 4, display: "flex", alignItems: "center",
          }}
        >
          <X size={13} color="currentColor" />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14,
          }}>
            <Sparkle size={20} color="var(--accent)" />
            <div style={{
              fontFamily: "var(--font-display)", fontStyle: "italic",
              fontSize: 14, color: "var(--ink-faint)", textAlign: "center", lineHeight: 1.6,
            }}>
              {userRoles.length > 0
                ? (isFr
                    ? `Je suis là pour t'aider à jouer ${userRoles.join(" ou ")}.`
                    : `I'm here to help you play ${userRoles.join(" or ")}.`)
                : (isFr
                    ? "Pose moi des questions sur les personnages, le sous-texte ou la mise en scène."
                    : "Ask about character motivation, subtext, or how to play a scene.")}
            </div>
            {/* Quick action chips */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 320 }}>
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleSend(action)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--rule)",
                    background: "var(--surface)",
                    color: "var(--ink-muted)",
                    fontFamily: "var(--font-body)",
                    fontSize: 12.5,
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.color = "var(--ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--rule)";
                    e.currentTarget.style.color = "var(--ink-muted)";
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const text = msg.parts
              .filter(isTextUIPart)
              .map((p) => p.text)
              .join("");
            if (!text) return null;

            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div style={{
                  maxWidth: "82%",
                  padding: "8px 11px",
                  borderRadius: isUser ? "12px 12px 4px 12px" : "4px 12px 12px 12px",
                  background: isUser ? "var(--accent)" : "var(--surface)",
                  border: isUser ? "none" : "1px solid var(--rule)",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: isUser ? "#fff" : "var(--ink)",
                  whiteSpace: "pre-wrap",
                }}>
                  {text}
                </div>
              </div>
            );
          })
        )}

        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "8px 12px",
              borderRadius: "4px 12px 12px 12px",
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "var(--ink-faint)",
                  animation: "souffleur-shimmer 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0,
        padding: "10px 14px",
        borderTop: "1px solid var(--rule)",
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        background: "var(--bg-elev)",
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            padding: "7px 10px",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--ink)",
            background: "var(--surface)",
            outline: "none",
            lineHeight: 1.5,
            maxHeight: 96,
            overflowY: "auto",
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isStreaming}
          style={{
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: "var(--radius-md)",
            border: "none",
            background: input.trim() && !isStreaming ? "var(--accent)" : "var(--line)",
            color: input.trim() && !isStreaming ? "#fff" : "var(--ink-faint)",
            cursor: input.trim() && !isStreaming ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          <ArrowUp size={14} color="currentColor" />
        </button>
      </div>
    </div>
  );
}
