"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewUpdate } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap, autocompletion, Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { linter, Diagnostic, lintGutter } from "@codemirror/lint";
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { parseSSF, type SsfError } from "@/lib/script-format";
import { SSF_TOKEN_STYLES } from "@/lib/ssf-tokens";

// ─── SSF Stream Language ──────────────────────────────────────────────────────
// Maps SSF syntax to Lezer tags via tokenTable

const ssfStreamLanguage = StreamLanguage.define<{ inCharBlock: boolean }>({
  name: "ssf",
  tokenTable: {
    actHeader:   t.heading1,
    sceneHeader: t.heading2,
    charName:    t.keyword,
    direction:   t.meta,
    dialogue:    t.string,
    divider:     t.contentSeparator,
  },
  startState: () => ({ inCharBlock: false }),
  token(stream, state) {
    // Comments
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    // Act header: # (but not ##)
    if (stream.sol() && stream.match(/^#(?!#)/)) {
      stream.skipToEnd();
      state.inCharBlock = false;
      return "actHeader";
    }

    // Scene header: ##
    if (stream.sol() && stream.match("##")) {
      stream.skipToEnd();
      state.inCharBlock = false;
      return "sceneHeader";
    }

    // Divider: ---
    if (stream.sol() && stream.match(/^---+$/)) {
      stream.skipToEnd();
      state.inCharBlock = false;
      return "divider";
    }

    // Standalone stage direction: line starting with ( — only outside a
    // character's dialogue. Inside dialogue, a parenthetical-only line is
    // still part of that line (handled by the inline-direction branch below),
    // so inCharBlock must NOT be reset there.
    if (stream.sol() && stream.peek() === "(" && !state.inCharBlock) {
      stream.match(/\(.*\)/);
      stream.skipToEnd();
      return "direction";
    }

    // Character line: @NAME, then optional (direction) emitted as a separate token
    if (stream.sol() && stream.peek() === "@") {
      stream.match(/[^(]*/); // consume @NAME and any trailing space, stop before (
      state.inCharBlock = true;
      return "charName";
    }

    // Inline stage direction within dialogue: (...)
    if (stream.peek() === "(") {
      if (!stream.match(/\(.*?\)/)) {
        // Unclosed paren — consume just the "(" so the stream still advances
        stream.next();
      }
      return "direction";
    }

    // Dialogue: consume only up to the next ( so inline directions get their own token
    if (state.inCharBlock) {
      if (!stream.match(/[^(]+/)) stream.next();
      return "dialogue";
    }

    // Outside char block: plain text → implicit didascalie
    stream.skipToEnd();
    return "direction";
  },
});

// ─── Highlight style using Souffleur CSS variables ────────────────────────────

const ssfHighlightStyle = HighlightStyle.define([
  { tag: t.comment,          ...SSF_TOKEN_STYLES.comment },
  { tag: t.heading1,         ...SSF_TOKEN_STYLES.actHeader },
  { tag: t.heading2,         ...SSF_TOKEN_STYLES.sceneHeader },
  { tag: t.keyword,          ...SSF_TOKEN_STYLES.charName },
  { tag: t.string,           ...SSF_TOKEN_STYLES.dialogue },
  { tag: t.meta,             ...SSF_TOKEN_STYLES.direction },
  { tag: t.contentSeparator, ...SSF_TOKEN_STYLES.divider },
]);

// ─── Character-name autocomplete (triggers after @ on a character cue line) ──

function characterNamesInDoc(text: string): string[] {
  const names = new Set<string>();
  for (const line of text.split("\n")) {
    const m = line.match(/^@([^(]+?)(?:\s*\(.*\))?\s*$/);
    if (m && m[1].trim()) names.add(m[1].trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function characterCompletionSource(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  if (!line.text.startsWith("@")) return null;
  const textOnLine = line.text.slice(0, context.pos - line.from);
  if (textOnLine.includes("(")) return null; // already typing the cue direction
  const from = line.from + 1; // right after "@"
  if (context.pos < from) return null;
  const typed = textOnLine.slice(1);

  const names = characterNamesInDoc(context.state.doc.toString());
  const lower = typed.toLowerCase();
  const matches = names.filter((n) => n.toLowerCase().startsWith(lower));
  const exists = names.some((n) => n.toLowerCase() === lower);

  const options: Completion[] = matches.map((n) => ({ label: n, type: "keyword" }));

  if (typed.trim().length > 0 && !exists) {
    options.push({
      label: typed,
      detail: "new character",
      type: "constant",
      boost: -1,
    });
  }

  if (options.length === 0) return null;
  return { from, options, filter: false };
}


// ─── Editor Theme ─────────────────────────────────────────────────────────────

const ssfTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    fontFamily: "var(--font-body)",
    background: "var(--bg)",
    color: "var(--ink)",
  },
  ".cm-content": {
    padding: "24px 0",
    caretColor: "var(--accent)",
    lineHeight: "1.75",
    maxWidth: 720,
    margin: "0 auto",
  },
  ".cm-line": {
    padding: "0 24px",
  },
  ".cm-focused .cm-cursor": {
    borderLeftColor: "var(--accent)",
  },
  "& ::selection": {
    background: "rgba(100, 149, 237, 0.30)",
  },
  ".cm-gutters": {
    background: "var(--bg-elev)",
    borderRight: "1px solid var(--rule)",
    color: "var(--ink-faint)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    minWidth: "44px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 4px",
  },
  ".cm-lintRange-error": {
    backgroundImage: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 3 l3 -3 l3 3' stroke='%23b24548' fill='none' stroke-width='1.2'/></svg>\")",
    backgroundRepeat: "repeat-x",
    backgroundPosition: "left bottom",
  },
  ".cm-lintRange-warning": {
    backgroundImage: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 3 l3 -3 l3 3' stroke='%23c48a17' fill='none' stroke-width='1.2'/></svg>\")",
    backgroundRepeat: "repeat-x",
    backgroundPosition: "left bottom",
  },
  ".cm-activeLine": {
    background: "var(--accent-faint)",
  },
  ".cm-tooltip": {
    background: "var(--bg-elev)",
    border: "1px solid var(--rule)",
    borderRadius: "var(--radius-md)",
    color: "var(--ink)",
    fontSize: "13px",
  },
  ".cm-tooltip.cm-tooltip-lint": {
    padding: "6px 10px",
  },
  ".cm-lintGutter": {
    width: "20px",
  },
  ".cm-tooltip-autocomplete": {
    border: "1px solid var(--rule)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete ul": {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    maxHeight: "220px",
  },
  ".cm-tooltip-autocomplete ul li": {
    padding: "5px 10px",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "var(--accent-faint)",
    color: "var(--ink)",
  },
  ".cm-completionDetail": {
    fontStyle: "normal",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--accent)",
    background: "var(--accent-faint)",
    padding: "1px 6px",
    borderRadius: "var(--radius-sm)",
    marginLeft: "8px",
  },
});

// ─── ScriptEditor component ───────────────────────────────────────────────────

interface ScriptEditorProps {
  initialText: string;
  onChange: (text: string) => void;
  onSave: (text: string) => void;
  onSaveReady?: (trigger: () => void) => void;
  onScrollReady?: (fn: (line: number) => void) => void;
  onCurrentHeading?: (h1: string | null, h2: string | null, headingLine: number | null) => void;
  onErrors?: (errors: SsfError[]) => void;
}

export default function ScriptEditor({ initialText, onChange, onSave, onSaveReady, onScrollReady, onCurrentHeading, onErrors }: ScriptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Stable-ref pattern: keep latest callbacks in refs so CodeMirror extensions
  // (registered once) always call the current version without needing to reinstall.
  const onSaveRef = useRef(onSave);
  // eslint-disable-next-line react-hooks/refs -- stable-ref: only read inside CM extension callbacks
  onSaveRef.current = onSave;
  const onChangeRef = useRef(onChange);
  // eslint-disable-next-line react-hooks/refs -- stable-ref: only read inside CM extension callbacks
  onChangeRef.current = onChange;
  const onSaveReadyRef = useRef(onSaveReady);
  // eslint-disable-next-line react-hooks/refs -- stable-ref: only read inside CM extension callbacks
  onSaveReadyRef.current = onSaveReady;
  const onScrollReadyRef = useRef(onScrollReady);
  // eslint-disable-next-line react-hooks/refs -- stable-ref: only read inside CM extension callbacks
  onScrollReadyRef.current = onScrollReady;
  const onCurrentHeadingRef = useRef(onCurrentHeading);
  // eslint-disable-next-line react-hooks/refs -- stable-ref: only read inside CM extension callbacks
  onCurrentHeadingRef.current = onCurrentHeading;
  const onErrorsRef = useRef(onErrors);
  // eslint-disable-next-line react-hooks/refs -- stable-ref: only read inside CM extension callbacks
  onErrorsRef.current = onErrors;

  const handleSave = useCallback(() => {
    if (viewRef.current) {
      onSaveRef.current(viewRef.current.state.doc.toString());
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run() {
          handleSave();
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
        recomputeHeading();
      }
    });

    // Find the line at the very top of the visible scroll area and walk
    // backward for the nearest h1/h2. Uses lineBlockAtHeight (a pure layout
    // query) instead of CodeMirror's rendered viewport, since the viewport
    // only updates when scrolling crosses its render-buffer boundary — not
    // on every scroll pixel — which made the banner lag or never appear.
    let lastFirstVisLine = 1;
    const HYSTERESIS_PX = 4; // dead zone to stop oscillation right at a line boundary

    function computeFirstVisLine(view: EditorView): number {
      const doc = view.state.doc;
      const scrollTop = view.scrollDOM.scrollTop;
      // Stay on the previously reported line as long as scrollTop hasn't
      // clearly moved past it — avoids flicker from sub-pixel scroll jitter.
      try {
        const lastLineNum = Math.min(Math.max(lastFirstVisLine, 1), doc.lines);
        const lastBlock = view.lineBlockAt(doc.line(lastLineNum).from);
        if (scrollTop >= lastBlock.top - HYSTERESIS_PX && scrollTop < lastBlock.bottom + HYSTERESIS_PX) {
          return lastLineNum;
        }
      } catch {
        // fall through to fresh lookup
      }
      try {
        return doc.lineAt(view.lineBlockAtHeight(scrollTop).from).number;
      } catch {
        return doc.lineAt(view.viewport.from).number;
      }
    }

    function recomputeHeading() {
      const view = viewRef.current;
      if (!view || !onCurrentHeadingRef.current) return;
      const doc = view.state.doc;
      const firstVisLine = computeFirstVisLine(view);
      lastFirstVisLine = firstVisLine;

      let h1: string | null = null;
      let h2: string | null = null;
      let h1Line: number | null = null;
      let h2Line: number | null = null;
      const scanFrom = firstVisLine - 1;

      // If the first visible line itself is a heading, it counts as the
      // current section right away — the banner should reflect it without
      // waiting for it to scroll out of view, so there's no hide/show flicker
      // at the boundary, only the text content updating.
      const selfText = doc.line(firstVisLine).text;
      const selfM2 = selfText.match(/^##\s*(.*)/);
      const selfM1 = !selfM2 && selfText.match(/^#(?!#)\s*(.*)/);
      if (selfM2) {
        h2 = selfM2[1].trim() || "Scene";
        h2Line = firstVisLine;
      } else if (selfM1) {
        // At an act heading: no scene chosen yet, nothing further to scan
        onCurrentHeadingRef.current(selfM1[1].trim() || "Act", null, firstVisLine);
        return;
      }

      for (let i = scanFrom; i >= 1; i--) {
        const text = doc.line(i).text;
        if (h2 === null) {
          const m2 = text.match(/^##\s*(.*)/);
          if (m2) { h2 = m2[1].trim() || "Scene"; h2Line = i; }
        }
        const m1 = text.match(/^#(?!#)\s*(.*)/);
        if (m1) { h1 = m1[1].trim() || "Act"; h1Line = i; break; }
      }
      onCurrentHeadingRef.current(h1, h2, h2Line ?? h1Line);
    }

    let scrollRaf: number | null = null;
    const onScroll = () => {
      if (scrollRaf !== null) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        recomputeHeading();
      });
    };

    const ssfLinter = linter((view) => {
      const text = view.state.doc.toString();
      const { errors } = parseSSF(text);
      const docLines = view.state.doc;
      const diagnostics: Diagnostic[] = [];
      for (const err of errors) {
        const lineObj = docLines.line(Math.min(err.line, docLines.lines));
        diagnostics.push({ from: lineObj.from, to: lineObj.to, severity: err.severity, message: err.message });
      }
      onErrorsRef.current?.(errors);
      return diagnostics;
    }, { delay: 600 });

    const extensions: Extension[] = [
      ssfStreamLanguage,
      syntaxHighlighting(ssfHighlightStyle),
      lineNumbers(),
      lintGutter(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      history(),
      closeBrackets(),
      autocompletion({ override: [characterCompletionSource] }),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      saveKeymap,
      updateListener,
      ssfLinter,
      ssfTheme,
      EditorView.lineWrapping,
    ];

    const state = EditorState.create({
      doc: initialText,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    // Register save trigger so parent can drive save without needing forwardRef
    onSaveReadyRef.current?.(handleSave);
    // Register scroll-to-line function so parent can jump to headings.
    // Jumping to a heading should scroll it just out of view (not leave it
    // sitting at the top) so the sticky banner for that heading appears
    // immediately, instead of being suppressed because the heading itself
    // is still the first visible line.
    onScrollReadyRef.current?.((lineNum: number) => {
      const v = viewRef.current;
      if (!v) return;
      const doc = v.state.doc;
      const clamped = Math.max(1, Math.min(lineNum, doc.lines));
      const lineObj = doc.line(clamped);
      v.dispatch({ effects: EditorView.scrollIntoView(lineObj.from, { y: "start" }) });
      requestAnimationFrame(() => {
        const view = viewRef.current;
        if (!view) return;
        const block = view.lineBlockAt(lineObj.from);
        view.scrollDOM.scrollTop = block.bottom + 1;
        recomputeHeading();
      });
      v.focus();
    });

    view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });
    recomputeHeading();

    return () => {
      view.scrollDOM.removeEventListener("scroll", onScroll);
      if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once only

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        overflow: "auto",
        background: "var(--bg)",
      }}
    />
  );
}
