"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, type UIMessage } from "ai";
import { X, Sparkle } from "@/components/ui/Icons";

function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n");
    const elements = lines.map((line, li) => {
      const h1 = line.match(/^#{1}\s+(.*)/);
      const h2 = line.match(/^#{2}\s+(.*)/);
      if (h1) return <strong key={li} style={{ display: "block", fontSize: 14, marginBottom: 2 }}>{inlineBold(h1[1])}</strong>;
      if (h2) return <strong key={li} style={{ display: "block", marginBottom: 1 }}>{inlineBold(h2[1])}</strong>;
      return <span key={li}>{inlineBold(line)}{li < lines.length - 1 && <br />}</span>;
    });
    return <p key={bi} style={{ margin: 0, marginBottom: bi < blocks.length - 1 ? 10 : 0 }}>{elements}</p>;
  });
}

function inlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    return bold ? <strong key={i}>{bold[1]}</strong> : <span key={i}>{part}</span>;
  });
}

function ArrowUp() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 13 13" fill="none">
      <path d="M8 2L3 6.5 8 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 4v2.5L8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 13 13" fill="none">
      <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
  preview: string | null;
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
  const t = useTranslations("play");
  const uiLocale = useLocale();

  const [input, setInput] = useState("");
  const [view, setView] = useState<"chat" | "sessions">("chat");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sceneRef = useRef<string | null>(currentSceneTitle);
  const sessionIdRef = useRef<string | null>(null);
  const titleGeneratedRef = useRef(false);

  useEffect(() => { sceneRef.current = currentSceneTitle; }, [currentSceneTitle]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/plays/${userPlayId}/chat`,
        body: { language, uiLocale },
        fetch: (url, init) => {
          const body = JSON.parse((init?.body as string) ?? "{}");
          body.currentSceneTitle = sceneRef.current;
          return globalThis.fetch(url, { ...init, body: JSON.stringify(body) });
        },
      }),
    [userPlayId, language, uiLocale]
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isThinking = status === "submitted";
  const isStreaming = status === "streaming";
  const isBusy = isThinking || isStreaming;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Auto-save after each complete response
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    const sId = sessionIdRef.current;
    if (!sId) return;

    const stored = messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts.filter(isTextUIPart).map((p) => ({ type: "text", text: p.text })),
    }));

    const shouldGenTitle = messages.length >= 2 && !titleGeneratedRef.current;
    if (shouldGenTitle) titleGeneratedRef.current = true;

    fetch(`/api/plays/${userPlayId}/chats/${sId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: stored, generateTitle: shouldGenTitle, uiLocale }),
    }).catch(console.error);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isBusy) return;
    setInput("");

    if (!sessionIdRef.current) {
      try {
        const res = await fetch(`/api/plays/${userPlayId}/chats`, { method: "POST" });
        if (res.ok) {
          const { id } = await res.json();
          sessionIdRef.current = id;
        }
      } catch { /* proceed without persistence */ }
    }

    sendMessage({ text: msg });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/plays/${userPlayId}/chats`);
      if (res.ok) setSessions(await res.json());
    } finally {
      setLoadingSessions(false);
    }
  }

  async function openSession(s: ChatSession) {
    const res = await fetch(`/api/plays/${userPlayId}/chats/${s.id}`);
    if (!res.ok) return;
    const { messages: stored } = await res.json();
    sessionIdRef.current = s.id;
    titleGeneratedRef.current = true;
    setMessages((stored ?? []) as UIMessage[]);
    setView("chat");
    setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
  }

  function startNewChat() {
    sessionIdRef.current = null;
    titleGeneratedRef.current = false;
    setMessages([]);
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function openHistory() {
    loadSessions();
    setView("sessions");
  }

  const quickActions = [
    t("coach.qaWho"),
    t("coach.qaObjective"),
    t("coach.qaHow"),
    t("coach.qaSubtext"),
  ];

  const placeholder = currentSceneTitle
    ? t("coach.placeholderScene")
    : userRoles.length > 0
      ? t("coach.placeholderRole", { roles: userRoles.join(", ") })
      : t("coach.placeholder");

  const iconBtn: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--ink-faint)",
    padding: 4,
    display: "flex",
    alignItems: "center",
    borderRadius: 6,
    flexShrink: 0,
    transition: "color 0.1s",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 20,
        width: 360,
        height: 520,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-elev)",
        borderRadius: "14px 14px 0 0",
        boxShadow: "0 -2px 32px rgba(0,0,0,0.14), 0 0 0 1px var(--rule)",
        animation: "souffleur-panel-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 10px 0 14px",
          borderBottom: "1px solid var(--rule)",
          gap: 6,
        }}
      >
        {view === "sessions" ? (
          <>
            <button style={iconBtn} onClick={() => setView("chat")}>
              <BackIcon />
            </button>
            <span
              style={{
                flex: 1,
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {t("coach.historyTitle")}
            </span>
            <button style={iconBtn} onClick={startNewChat} title={t("coach.newChat")}>
              <PlusIcon />
            </button>
          </>
        ) : (
          <>
            <Sparkle size={11} color="var(--accent)" />
            <span
              style={{
                flex: 1,
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {t("coach.title")}
            </span>
            {currentSceneTitle && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  color: "var(--ink-faint)",
                  letterSpacing: 0.3,
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentSceneTitle}
              </span>
            )}
            {messages.length > 0 && (
              <button
                onClick={startNewChat}
                style={{
                  padding: "3px 9px",
                  borderRadius: 100,
                  border: "1px solid var(--rule)",
                  background: "none",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "border-color 0.1s, color 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--ink)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule)"; e.currentTarget.style.color = "var(--ink-muted)"; }}
              >
                + {t("coach.newChat")}
              </button>
            )}
            <button style={iconBtn} onClick={openHistory} title={t("coach.history")}>
              <HistoryIcon />
            </button>
          </>
        )}
        <button style={iconBtn} onClick={onClose}>
          <X size={13} color="currentColor" />
        </button>
      </div>

      {view === "sessions" ? (
        /* ── Sessions list ── */
        <div style={{ flex: 1, overflow: "auto" }}>
          {loadingSessions ? (
            <div
              style={{
                padding: 24,
                color: "var(--ink-faint)",
                fontSize: 12,
                fontFamily: "var(--font-body)",
              }}
            >
              {t("coach.loading")}
            </div>
          ) : sessions.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                color: "var(--ink-faint)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {t("coach.noHistory")}
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s)}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--rule)",
                  cursor: "pointer",
                  display: "block",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ink)",
                    fontFamily: "var(--font-body)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.title ?? t("coach.untitled")}
                </div>
                {s.preview && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--ink-faint)",
                      fontFamily: "var(--font-body)",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.preview}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--ink-faint)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 4,
                    letterSpacing: 0.2,
                  }}
                >
                  {new Date(s.created_at).toLocaleDateString(uiLocale, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "18px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {messages.length === 0 && !isThinking ? (
              /* ── Empty state ── */
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                }}
              >
                <Sparkle size={18} color="var(--accent)" />
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: 13.5,
                    color: "var(--ink-faint)",
                    textAlign: "center",
                    lineHeight: 1.65,
                  }}
                >
                  {userRoles.length > 0
                    ? t("coach.inviteRole", { roles: userRoles.join(", ") })
                    : t("coach.invite")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleSend(action)}
                      style={{
                        padding: "6px 13px",
                        borderRadius: 100,
                        border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                        background: "color-mix(in srgb, var(--accent) 7%, transparent)",
                        color: "var(--ink-muted)",
                        fontFamily: "var(--font-body)",
                        fontSize: 12,
                        cursor: "pointer",
                        lineHeight: 1.4,
                        whiteSpace: "nowrap",
                        transition: "background 0.15s, color 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)";
                        e.currentTarget.style.color = "var(--ink)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 30%, transparent)";
                        e.currentTarget.style.color = "var(--ink-muted)";
                      }}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const text = msg.parts.filter(isTextUIPart).map((p) => p.text).join("");
                  if (!text) return null;

                  const isUser = msg.role === "user";
                  const isLastMsg = idx === messages.length - 1;
                  const showCursor = !isUser && isLastMsg && isStreaming;

                  if (isUser) {
                    return (
                      <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div
                          style={{
                            maxWidth: "78%",
                            padding: "7px 12px",
                            borderRadius: "12px 12px 2px 12px",
                            background: "var(--ink)",
                            color: "var(--bg)",
                            fontFamily: "var(--font-body)",
                            fontSize: 13,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {text}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                        <Sparkle size={9} color="var(--accent)" />
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 8,
                            textTransform: "uppercase",
                            letterSpacing: 1.3,
                            color: "var(--accent)",
                            fontWeight: 700,
                          }}
                        >
                          Coach
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          lineHeight: 1.72,
                          color: "var(--ink)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {renderMarkdown(text)}
                        {showCursor && <span className="souffleur-ai-cursor" />}
                      </div>
                    </div>
                  );
                })}

                {isThinking && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                      <Sparkle size={9} color="var(--accent)" />
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 8,
                          textTransform: "uppercase",
                          letterSpacing: 1.3,
                          color: "var(--accent)",
                          fontWeight: 700,
                        }}
                      >
                        Coach
                      </span>
                    </div>
                    <span
                      className="souffleur-ai-text-shimmer"
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.3 }}
                    >
                      {t("coach.thinking")}
                    </span>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              flexShrink: 0,
              padding: "10px 12px 12px",
              borderTop: "1px solid var(--rule)",
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
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
                maxHeight: 80,
                overflowY: "auto",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isBusy}
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: "var(--radius-md)",
                border: "none",
                background: input.trim() && !isBusy ? "var(--accent)" : "var(--line)",
                color: input.trim() && !isBusy ? "#fff" : "var(--ink-faint)",
                cursor: input.trim() && !isBusy ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
              }}
            >
              <ArrowUp />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
