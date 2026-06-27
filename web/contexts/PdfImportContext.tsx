"use client";

import { createContext, useContext, useRef, useState } from "react";
import { useLocale } from "next-intl";

export type ImportMode = "text" | "ocr" | "vision";

export interface PendingImport {
  file: File;
  fileName: string;
  fileSize: number; // bytes
  pageCount: number;
  likelyMode: "text" | "scan"; // client-side heuristic
  estimatedSec: number;
}

interface PdfImportState {
  isImporting: boolean;
  isSaving: boolean;
  isDone: boolean;
  playId: string | null;
  streamingText: string;
  importTitle: string | null;
  importAuthor: string | null;
  importError: string | null;
  startedAt: number | null;
  pageCount: number | null;
  extractedTextLength: number | null;
  ocrProgress: { processed: number; total: number } | null;
  importMode: ImportMode | null;
  pendingImport: PendingImport | null;
}

interface PdfImportContextValue extends PdfImportState {
  startImport: (file: File) => Promise<{ playId: string | null; error?: string }>;
  clearImport: () => void;
  setPendingImport: (data: PendingImport, onConfirm: () => Promise<void>) => void;
  clearPendingImport: () => void;
  confirmPendingImport: () => Promise<void>;
}

const PdfImportContext = createContext<PdfImportContextValue | null>(null);

const INITIAL_STATE: PdfImportState = {
  isImporting: false,
  isSaving: false,
  isDone: false,
  playId: null,
  streamingText: "",
  importTitle: null,
  importAuthor: null,
  importError: null,
  startedAt: null,
  pageCount: null,
  extractedTextLength: null,
  ocrProgress: null,
  importMode: null,
  pendingImport: null,
};

export function PdfImportProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [state, setState] = useState<PdfImportState>(INITIAL_STATE);

  const resolveRef = useRef<((result: { playId: string | null; error?: string }) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Stored in a ref to avoid React treating a function value as a state-updater
  const pendingConfirmRef = useRef<(() => Promise<void>) | null>(null);

  async function startImport(file: File): Promise<{ playId: string | null; error?: string }> {
    setState((s) => ({
      ...INITIAL_STATE,
      // preserve pendingImport/importMode reset
      isImporting: true,
      startedAt: Date.now(),
    }));

    const playIdPromise = new Promise<{ playId: string | null; error?: string }>((resolve) => {
      resolveRef.current = resolve;
    });

    runStream(file);

    return playIdPromise;
  }

  async function runStream(file: File) {
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("locale", locale);

      const res = await fetch("/api/plays/import-pdf", { method: "POST", body: formData, signal: abort.signal });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as Record<string, string>).error ?? "Import failed";
        setState((s) => ({ ...s, isImporting: false, importError: msg }));
        resolveRef.current?.({ playId: null, error: msg });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          let event: { type: string; [k: string]: unknown };
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === "created") {
            const playId = event.playId as string;
            const pageCount = (event.pageCount as number) || null;
            const extractedTextLength = (event.extractedTextLength as number) || null;
            const importMode = (event.mode as ImportMode) || null;
            setState((s) => ({ ...s, playId, pageCount, extractedTextLength, importMode }));
            resolveRef.current?.({ playId });
          } else if (event.type === "ocr_progress") {
            const processed = event.processed as number;
            const total = event.total as number;
            setState((s) => ({ ...s, ocrProgress: { processed, total } }));
          } else if (event.type === "ocr_done") {
            const extractedTextLength = (event.extractedTextLength as number) || null;
            setState((s) => ({ ...s, extractedTextLength, importMode: "ocr" }));
          } else if (event.type === "ocr_failed") {
            setState((s) => ({ ...s, importMode: "vision" }));
          } else if (event.type === "meta") {
            setState((s) => ({
              ...s,
              importTitle: (event.title as string) || s.importTitle,
              importAuthor: (event.author as string) || s.importAuthor,
            }));
          } else if (event.type === "delta") {
            setState((s) => ({ ...s, streamingText: s.streamingText + (event.text as string) }));
          } else if (event.type === "saving") {
            setState((s) => ({ ...s, isSaving: true }));
          } else if (event.type === "done") {
            setState((s) => ({ ...s, isImporting: false, isSaving: false, isDone: true }));
          } else if (event.type === "error") {
            const msg = (event.message as string) ?? "Import failed";
            setState((s) => ({ ...s, isImporting: false, isSaving: false, importError: msg }));
            resolveRef.current?.({ playId: null, error: msg });
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Import failed";
      setState((s) => ({ ...s, isImporting: false, importError: msg }));
      resolveRef.current?.({ playId: null, error: msg });
    }
  }

  function clearImport() {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }

  function setPendingImport(data: PendingImport, onConfirm: () => Promise<void>) {
    pendingConfirmRef.current = onConfirm;
    setState((s) => ({ ...s, pendingImport: data }));
  }

  function clearPendingImport() {
    pendingConfirmRef.current = null;
    setState((s) => ({ ...s, pendingImport: null }));
  }

  async function confirmPendingImport() {
    const cb = pendingConfirmRef.current;
    clearPendingImport();
    if (cb) await cb();
  }

  return (
    <PdfImportContext.Provider value={{
      ...state,
      startImport,
      clearImport,
      setPendingImport,
      clearPendingImport,
      confirmPendingImport,
    }}>
      {children}
    </PdfImportContext.Provider>
  );
}

export function usePdfImport() {
  const ctx = useContext(PdfImportContext);
  if (!ctx) throw new Error("usePdfImport must be inside PdfImportProvider");
  return ctx;
}
