"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePlayRoles } from "@/contexts/PlayRolesContext";
import type { ContentEntry } from "@/lib/script-types";
import { extractCleanSpeechText } from "@/lib/script-types";
import { Chev } from "@/components/ui/Icons";
import type { AudioManifestLine } from "@/app/api/plays/[id]/audio-manifest/route";
import type { WordTimestamp } from "@/lib/ai/polly";

interface Scene {
  id: string;
  act: string;
  scene: string;
  sort_order: number;
  title?: string;
  content: ContentEntry[];
}

interface PracticeSessionProps {
  scenes: Scene[];
  userPlayId: string;
  initialSceneId?: string;
  language?: string | null;
}

const TTS_LANG: Record<string, string> = {
  fr: "fr-FR", en: "en-US", de: "de-DE", es: "es-ES",
  it: "it-IT", pt: "pt-PT", ru: "ru-RU", nl: "nl-NL", pl: "pl-PL", sv: "sv-SE",
};

interface Entry {
  content: ContentEntry;
  contentIdx: number;
  isLine: boolean;
  showChar: boolean;
  isYou: boolean;
}

interface PollyEntry {
  blob: Blob;
  wordTimestamps: WordTimestamp[];
  durationMs: number;
}

interface LineDebugInfo {
  voiceId: string;
  gender: string;
  character: string;
  language: string;
  signedUrl: string | null;
}

function sceneLabel(s: Scene): string {
  if (s.title) {
    const short = s.title.replace(/^Scene\s+\d+\s*:\s*/i, "");
    return short.length > 30 ? short.slice(0, 29) + "…" : short;
  }
  if (s.act) return s.act;
  return `Scene ${s.sort_order ?? 1}`;
}

function sceneHasRole(s: Scene, roles: string[]): boolean {
  if (!roles.length) return false;
  return s.content.some((e) => (e.type ?? "line") === "line" && roles.includes(e.ch ?? ""));
}

// Full speech text (including stage directions, for browser TTS)
function extractFullSpeechText(e: Entry): string {
  if (!e.isLine) return e.content.text ?? "";
  if (e.content.segments) {
    return e.content.segments
      .map((s) => (s.action ? `(${s.action})` : (s.text ?? "")))
      .join(" ").replace(/\s+/g, " ").trim();
  }
  return e.content.text ?? "";
}

function activeWordIdx(timestamps: WordTimestamp[], currentMs: number): number {
  let idx = -1;
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i].time <= currentMs) idx = i;
    else break;
  }
  return idx;
}

function wordToCharRange(
  cleanText: string, timestamps: WordTimestamp[], wordIdx: number
): { start: number; length: number } | null {
  let pos = 0;
  for (let i = 0; i <= wordIdx; i++) {
    const w = timestamps[i].word;
    const found = cleanText.indexOf(w, pos);
    if (found === -1) return null;
    if (i === wordIdx) return { start: found, length: w.length };
    pos = found + w.length;
  }
  return null;
}

function LineText({
  entry, speechText, wordStart, wordLen,
}: { entry: ContentEntry; speechText: string; wordStart: number; wordLen: number }) {
  const plain = entry.text ?? "";
  const hasHighlight = wordLen > 0 && plain === speechText;

  if (entry.segments) {
    return (
      <>
        {entry.segments.map((seg, i) =>
          seg.action ? (
            <em key={i} style={{ color: "var(--ink-muted)", fontSize: "0.9em" }}> ({seg.action}) </em>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </>
    );
  }

  if (!hasHighlight) return <>{plain}</>;
  const end = wordStart + wordLen;
  return (
    <>
      {plain.slice(0, wordStart)}
      <mark style={{ background: "var(--highlight)", color: "inherit", borderRadius: 2, padding: "0 1px" }}>
        {plain.slice(wordStart, end)}
      </mark>
      {plain.slice(end)}
    </>
  );
}

// Per-line audio badge — shown after the character name
// idle / loading / generating → null (no indicator)
// done   → "AI" label in accent colour
// error  → monitor icon + "↺ AI" retry button
function LineAudioBadge({
  state, onRetry, debugInfo,
}: { state: "idle" | "loading" | "generating" | "done" | "error"; onRetry: () => void; debugInfo?: LineDebugInfo }) {
  if (state === "done") {
    const tooltipParts: string[] = [];
    if (debugInfo?.character) tooltipParts.push(`char: ${debugInfo.character}`);
    if (debugInfo?.voiceId) tooltipParts.push(`voice: ${debugInfo.voiceId}`);
    if (debugInfo?.gender) tooltipParts.push(`gender: ${debugInfo.gender}`);
    if (debugInfo?.language) tooltipParts.push(`lang: ${debugInfo.language}`);
    if (debugInfo?.signedUrl) tooltipParts.push(`url: ${debugInfo.signedUrl}`);
    return (
      <span
        title={tooltipParts.length ? tooltipParts.join("\n") : undefined}
        style={{
          fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 0.8,
          color: "var(--accent)", fontWeight: 600, lineHeight: 1,
          animation: "souffleur-ai-badge-appear 0.25s ease both",
          cursor: tooltipParts.length ? "help" : "default",
        }}
      >
        AI
      </span>
    );
  }

  if (state === "error") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onRetry(); }}
        title="Retry AI voice for this line"
        style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          background: "none", border: "none", cursor: "pointer",
          padding: 0, lineHeight: 1, color: "var(--ink-faint)",
        }}
      >
        {/* Monitor / browser icon */}
        <svg width="11" height="10" viewBox="0 0 11 10" fill="none">
          <rect x="0.5" y="0.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1" />
          <path d="M0.5 3h10" stroke="currentColor" strokeWidth="0.8" />
          <path d="M3.5 9.5h4M5.5 7.5v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: 0.3,
          color: "var(--rose)",
        }}>↺AI</span>
      </button>
    );
  }

  return null;
}

// Waveform canvas — drawn by the parent via analyser ref
function WaveformCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={28}
      style={{ width: 180, height: 28, borderRadius: 4, opacity: 0.85 }}
    />
  );
}

export default function PracticeSession({
  scenes, userPlayId, initialSceneId, language,
}: PracticeSessionProps) {
  const locale = useLocale();
  const t = useTranslations("play");
  const { roles } = usePlayRoles();
  const lang = (language && TTS_LANG[language]) ?? (locale === "fr" ? "fr-FR" : "en-US");

  const [sceneIdx, setSceneIdx] = useState(() => {
    const idx = initialSceneId ? scenes.findIndex((s) => s.id === initialSceneId) : 0;
    return idx >= 0 ? idx : 0;
  });
  const [active, setActive] = useState(-1);
  const [paused, setPaused] = useState(false);
  const [word, setWord] = useState<{ start: number; length: number } | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // ── Analysis gate ─────────────────────────────────────────────────────────
  // Block download until the play has been analyzed (language + character profiles needed for voice selection)
  const [analysisReady, setAnalysisReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function checkAnalysis() {
      try {
        const res = await fetch(`/api/plays/${userPlayId}/analysis`);
        if (!res.ok || cancelled) return;
        const { analysis } = await res.json();
        if (analysis?.detected_language) {
          setAnalysisReady(true);
          if (intervalId) { clearInterval(intervalId); intervalId = null; }
        }
      } catch {}
    }

    checkAnalysis();
    intervalId = setInterval(checkAnalysis, 3000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [userPlayId]);

  // ── Audio cache state ─────────────────────────────────────────────────────
  const [manifestEntries, setManifestEntries] = useState<AudioManifestLine[]>([]);
  const [cachedHashes, setCachedHashes] = useState<Set<string>>(new Set());
  const [loadingHashes, setLoadingHashes] = useState<Set<string>>(new Set());
  const [manifestVersion, setManifestVersion] = useState(0);
  const [sceneDownloading, setSceneDownloading] = useState(false);
  const [downloadingSceneSortOrder, setDownloadingSceneSortOrder] = useState<number | null>(null);
  const [sceneDownloadProgress, setSceneDownloadProgress] = useState<{ done: number; total: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // Error tracking: content_hashes of lines that failed to generate
  const [errorHashes, setErrorHashes] = useState<Set<string>>(new Set());
  // Maps "sort:idx" → content_hash for errored lines (not in manifest)
  const errorMapRef = useRef<Map<string, string>>(new Map());
  const [banner, setBanner] = useState<{ ai: number; browser: number } | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAiActive, setIsAiActive] = useState(false);

  // ── Audio refs ────────────────────────────────────────────────────────────
  const pollyCache = useRef<Map<string, PollyEntry>>(new Map());
  const manifestMap = useRef<Map<string, string>>(new Map()); // "sort:idx" → hash
  const lineDebugRef = useRef<Map<string, LineDebugInfo>>(new Map()); // "sort:idx" → debug info
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number>(0);
  const accentColorRef = useRef<string>("#8b5cf6");

  const currentScene = scenes[sceneIdx];
  const hasPrev = sceneIdx > 0;
  const hasNext = sceneIdx < scenes.length - 1;

  const currentSortOrderRef = useRef(currentScene.sort_order);
  useEffect(() => { currentSortOrderRef.current = currentScene.sort_order; }, [currentScene.sort_order]);

  const entries = useMemo((): Entry[] => {
    const result: Entry[] = [];
    let prevCh: string | null = null;
    currentScene.content.forEach((e, ci) => {
      const tp = e.type ?? "line";
      if (tp === "line") {
        const isYou = roles.length > 0 ? roles.includes(e.ch ?? "") : (e.you ?? false);
        result.push({ content: e, contentIdx: ci, isLine: true, showChar: e.ch !== prevCh, isYou });
        prevCh = e.ch ?? null;
      } else if (tp === "action" || tp === "scene_direction" || tp === "direction") {
        result.push({ content: e, contentIdx: ci, isLine: false, showChar: false, isYou: false });
      }
    });
    return result;
  }, [currentScene, roles]);

  const started = active >= 0;
  const done = active >= entries.length;

  // ── Per-scene AI audio status ─────────────────────────────────────────────
  const sceneManifestEntries = useMemo(
    () => manifestEntries.filter((e) => e.scene_sort_order === currentScene.sort_order),
    [manifestEntries, currentScene.sort_order]
  );
  const sceneCachedCount = useMemo(
    () => sceneManifestEntries.filter((e) => cachedHashes.has(e.content_hash)).length,
    [sceneManifestEntries, cachedHashes]
  );
  const sceneLineCount = useMemo(
    () => entries.filter((e) => e.isLine && extractCleanSpeechText(e.content).trim()).length,
    [entries]
  );

  // Count errored lines in the current scene
  const sceneErrorCount = useMemo(() => {
    let count = 0;
    for (const e of entries) {
      if (!e.isLine) continue;
      const key = `${currentScene.sort_order}:${e.contentIdx}`;
      if (errorMapRef.current.has(key)) count++;
    }
    return count;
    // errorHashes in deps so this recomputes when errors change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, currentScene.sort_order, errorHashes]);

  const isLineCached = useCallback(
    (entry: Entry): boolean => {
      const key = `${currentScene.sort_order}:${entry.contentIdx}`;
      const hash = manifestMap.current.get(key);
      return hash ? cachedHashes.has(hash) : false;
    },
    [currentScene.sort_order, cachedHashes]
  );

  const isLineLoading = useCallback(
    (entry: Entry): boolean => {
      const key = `${currentScene.sort_order}:${entry.contentIdx}`;
      const hash = manifestMap.current.get(key);
      return hash ? loadingHashes.has(hash) : false;
    },
    [currentScene.sort_order, loadingHashes]
  );

  // True while Polly is generating this specific line (only for the downloading scene)
  const isLineGenerating = useCallback(
    (entry: Entry): boolean => {
      if (downloadingSceneSortOrder !== currentScene.sort_order) return false;
      if (!entry.isLine) return false;
      if (isLineCached(entry)) return false;
      const key = `${currentScene.sort_order}:${entry.contentIdx}`;
      return !errorMapRef.current.has(key);
    },
    // errorHashes included to react to new errors stopping the generating state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [downloadingSceneSortOrder, currentScene.sort_order, isLineCached, errorHashes]
  );

  const isLineError = useCallback(
    (entry: Entry): boolean => {
      const key = `${currentScene.sort_order}:${entry.contentIdx}`;
      return errorMapRef.current.has(key);
    },
    // errorHashes triggers re-render when set changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentScene.sort_order, errorHashes]
  );

  const isSceneLoading = useMemo(
    () => sceneManifestEntries.some((e) => loadingHashes.has(e.content_hash)),
    [sceneManifestEntries, loadingHashes]
  );

  // ── Read accent CSS variable ──────────────────────────────────────────────
  useEffect(() => {
    accentColorRef.current =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8b5cf6";
  }, []);

  // ── Fetch manifest + prefetch blobs ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function prefetch() {
      const { getCachedAudio, setCachedAudio } = await import("@/lib/audio-cache");

      let res: Response;
      try { res = await fetch(`/api/plays/${userPlayId}/audio-manifest`); }
      catch { return; }
      if (!res.ok || cancelled) return;

      const manifest: AudioManifestLine[] = await res.json();
      if (cancelled) return;

      const newManifestMap = new Map<string, string>();
      for (const line of manifest) {
        newManifestMap.set(`${line.scene_sort_order}:${line.line_index}`, line.content_hash);
      }
      manifestMap.current = newManifestMap;
      // Seed debug info from manifest (signed_url only; voice info added during download)
      for (const line of manifest) {
        const k = `${line.scene_sort_order}:${line.line_index}`;
        if (!lineDebugRef.current.has(k)) {
          lineDebugRef.current.set(k, {
            voiceId: "", gender: "", character: "",
            language: language ?? "unknown",
            signedUrl: line.signed_url,
          });
        }
      }
      setManifestEntries(manifest);

      // Sort: current scene first, then ascending sort_order
      const thisSortOrder = currentSortOrderRef.current;
      const sorted = [...manifest].sort((a, b) => {
        const aIsCurrent = a.scene_sort_order === thisSortOrder;
        const bIsCurrent = b.scene_sort_order === thisSortOrder;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (bIsCurrent && !aIsCurrent) return 1;
        return a.scene_sort_order !== b.scene_sort_order
          ? a.scene_sort_order - b.scene_sort_order
          : a.line_index - b.line_index;
      });

      const newCachedHashes = new Set<string>();
      for (const line of sorted) {
        if (cancelled) return;
        if (pollyCache.current.has(line.content_hash)) {
          newCachedHashes.add(line.content_hash);
          setCachedHashes(new Set(newCachedHashes));
          continue;
        }
        const cached = await getCachedAudio(line.content_hash).catch(() => null);
        if (cached) {
          pollyCache.current.set(line.content_hash, {
            blob: cached.audio_blob,
            wordTimestamps: cached.word_timestamps,
            durationMs: cached.duration_ms,
          });
          newCachedHashes.add(line.content_hash);
          setCachedHashes(new Set(newCachedHashes));
          continue;
        }
        if (!line.signed_url) continue;
        setLoadingHashes((prev) => { const s = new Set(prev); s.add(line.content_hash); return s; });
        try {
          const audioRes = await fetch(line.signed_url);
          if (!audioRes.ok || cancelled) {
            setLoadingHashes((prev) => { const s = new Set(prev); s.delete(line.content_hash); return s; });
            continue;
          }
          const blob = await audioRes.blob();
          const wts = line.word_timestamps ?? [];
          const dms = line.duration_ms ?? 0;
          await setCachedAudio({ content_hash: line.content_hash, audio_blob: blob, word_timestamps: wts, duration_ms: dms }).catch(() => {});
          pollyCache.current.set(line.content_hash, { blob, wordTimestamps: wts, durationMs: dms });
          newCachedHashes.add(line.content_hash);
          setLoadingHashes((prev) => { const s = new Set(prev); s.delete(line.content_hash); return s; });
          setCachedHashes(new Set(newCachedHashes));
        } catch {
          setLoadingHashes((prev) => { const s = new Set(prev); s.delete(line.content_hash); return s; });
        }
      }
    }

    prefetch();
    return () => { cancelled = true; };
  }, [userPlayId, manifestVersion]);

  // ── Scene-level download ──────────────────────────────────────────────────
  async function downloadScene() {
    if (!analysisReady) {
      setDownloadError("Play analysis not ready yet — please wait");
      return;
    }

    const sortOrder = currentScene.sort_order;

    // Clear previous errors for this scene
    errorMapRef.current.clear();
    setErrorHashes(new Set());
    setDownloadError(null);
    setSceneDownloading(true);
    setDownloadingSceneSortOrder(sortOrder);
    const total = sceneLineCount;
    setSceneDownloadProgress({ done: 0, total });

    // Ensure scene_audio_lines rows exist (resets any error rows to pending)
    try {
      await fetch(`/api/plays/${userPlayId}/sync-audio`, { method: "POST" });
    } catch { /* non-fatal */ }

    const { getCachedAudio: _g, setCachedAudio } = await import("@/lib/audio-cache");

    let remaining = 1;
    let succeeded = 0;
    while (remaining > 0) {
      try {
        const res = await fetch(
          `/api/plays/${userPlayId}/generate-audio?scene=${sortOrder}`,
          { method: "POST" }
        );
        if (res.status === 503) {
          setDownloadError("AWS voices not configured");
          break;
        }
        if (!res.ok) {
          setDownloadError("Generation failed — try again");
          break;
        }
        const data = await res.json();
        remaining = data.remaining ?? 0;
        succeeded += data.succeeded ?? 0;
        setSceneDownloadProgress({ done: succeeded, total });

        // Track errored lines immediately so their dots update
        for (const fl of (data.failedLines ?? []) as Array<{
          scene_sort_order: number; line_index: number; content_hash: string;
        }>) {
          const key = `${fl.scene_sort_order}:${fl.line_index}`;
          errorMapRef.current.set(key, fl.content_hash);
          setErrorHashes((prev) => { const s = new Set(prev); s.add(fl.content_hash); return s; });
        }

        // Download succeeded blobs immediately so badges update per-line
        for (const sl of (data.succeededLines ?? []) as Array<{
          content_hash: string; word_timestamps: any[]; duration_ms: number; signed_url: string | null;
          scene_sort_order: number; line_index: number; tts_voice_id: string; character_name: string; gender: string;
        }>) {
          // Update manifestMap so isLineCached can find hash by sort:idx even before manifest refresh
          const lineKey = `${sl.scene_sort_order}:${sl.line_index}`;
          manifestMap.current.set(lineKey, sl.content_hash);
          // Store debug info for hover tooltip
          lineDebugRef.current.set(lineKey, {
            voiceId: sl.tts_voice_id,
            gender: sl.gender,
            character: sl.character_name,
            language: language ?? "unknown",
            signedUrl: sl.signed_url,
          });

          if (!sl.signed_url || pollyCache.current.has(sl.content_hash)) {
            // Even without blob, mark cached so badge appears
            setCachedHashes((prev) => { const s = new Set(prev); s.add(sl.content_hash); return s; });
            continue;
          }
          try {
            const blobRes = await fetch(sl.signed_url);
            if (!blobRes.ok) continue;
            const blob = await blobRes.blob();
            const wts = sl.word_timestamps ?? [];
            const dms = sl.duration_ms ?? 0;
            await setCachedAudio({ content_hash: sl.content_hash, audio_blob: blob, word_timestamps: wts, duration_ms: dms }).catch(() => {});
            pollyCache.current.set(sl.content_hash, { blob, wordTimestamps: wts, durationMs: dms });
            setCachedHashes((prev) => { const s = new Set(prev); s.add(sl.content_hash); return s; });
          } catch {}
        }

        if (data.failed > 0 && data.succeeded === 0 && data.firstError) {
          setDownloadError(data.firstError.slice(0, 80));
          break;
        }
      } catch {
        setDownloadError("Network error — try again");
        break;
      }
    }

    setSceneDownloading(false);
    setDownloadingSceneSortOrder(null);
    setSceneDownloadProgress(null);
    // Refresh manifest so newly ready lines are included in sceneManifestEntries
    setManifestVersion((v) => v + 1);
  }

  // ── Banner on scene change ────────────────────────────────────────────────
  useEffect(() => {
    if (manifestEntries.length === 0) return;
    const sceneTotal = sceneManifestEntries.length;
    if (sceneTotal === 0) return;

    const ai = sceneCachedCount;
    const browser = sceneLineCount - ai;
    if (browser > 0) {
      setBanner({ ai, browser });
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), 6000);
    } else {
      setBanner(null);
    }
    return () => { if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); };
  }, [sceneIdx, sceneCachedCount]);

  // ── Web Audio context + waveform ──────────────────────────────────────────
  function getAudioEl(): HTMLAudioElement {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  }

  function ensureAudioCtx(el: HTMLAudioElement) {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
      return;
    }
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(el);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.96;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
  }

  function startWaveform() {
    const canvas = waveformCanvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    const accent = accentColorRef.current;

    function draw() {
      rafIdRef.current = requestAnimationFrame(draw);
      analyser!.getByteTimeDomainData(data);
      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);
      ctx!.strokeStyle = accent;
      ctx!.lineWidth = 1.5;
      ctx!.shadowColor = accent;
      ctx!.shadowBlur = 4;
      ctx!.beginPath();
      const sliceW = w / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const deviation = (data[i] / 128.0) - 1.0; // −1..+1, silence = 0
        const y = (h / 2) + Math.max(-h / 2, Math.min(h / 2, deviation * h * 1.1));
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
        x += sliceW;
      }
      ctx!.lineTo(w, h / 2);
      ctx!.stroke();
    }
    draw();
  }

  function stopWaveform() {
    cancelAnimationFrame(rafIdRef.current);
    const canvas = waveformCanvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── TTS effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (active < 0 || active >= entries.length || paused) return;
    const e = entries[active];

    if (!e.isLine) {
      const t = setTimeout(() => setActive((i) => i + 1), 600);
      return () => clearTimeout(t);
    }

    const fullText = extractFullSpeechText(e);
    if (!fullText.trim()) {
      const t = setTimeout(() => setActive((i) => i + 1), 80);
      return () => clearTimeout(t);
    }

    const cacheKey = `${currentScene.sort_order}:${e.contentIdx}`;
    const hash = manifestMap.current.get(cacheKey);
    const pollyEntry = hash ? pollyCache.current.get(hash) : undefined;

    if (pollyEntry) {
      const cleanText = extractCleanSpeechText(e.content);
      const audio = getAudioEl();
      ensureAudioCtx(audio);
      const objectUrl = URL.createObjectURL(pollyEntry.blob);
      audio.src = objectUrl;
      setIsAiActive(true);

      // Use RAF for word sync instead of ontimeupdate (~250ms intervals misses
      // the first word when Polly starts speaking immediately at time=0)
      let wordRafId = 0;
      let lastWordIdx = -2;
      function syncWord() {
        wordRafId = requestAnimationFrame(syncWord);
        if (audio.paused || audio.ended) return;
        const ms = audio.currentTime * 1000;
        const idx = activeWordIdx(pollyEntry!.wordTimestamps, ms);
        if (idx === lastWordIdx) return; // no change
        lastWordIdx = idx;
        if (idx >= 0) setWord(wordToCharRange(cleanText, pollyEntry!.wordTimestamps, idx));
        else setWord(null);
      }

      audio.onended = () => {
        cancelAnimationFrame(wordRafId);
        URL.revokeObjectURL(objectUrl);
        stopWaveform();
        setIsAiActive(false);
        setWord(null);
        setActive((i) => (i < entries.length ? i + 1 : i));
      };
      audio.onerror = () => {
        cancelAnimationFrame(wordRafId);
        URL.revokeObjectURL(objectUrl);
        stopWaveform();
        setIsAiActive(false);
        setWord(null);
        setActive((i) => (i < entries.length ? i + 1 : i));
      };

      const t = setTimeout(() => {
        audio.play().then(() => { startWaveform(); syncWord(); }).catch(() => {});
      }, 50);

      return () => {
        clearTimeout(t);
        cancelAnimationFrame(wordRafId);
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
        URL.revokeObjectURL(objectUrl);
        stopWaveform();
        setIsAiActive(false);
        setWord(null);
      };
    }

    // Browser TTS fallback
    setIsAiActive(false);
    if (!("speechSynthesis" in window)) return;
    const cleanForBrowser = extractCleanSpeechText(e.content);
    if (!cleanForBrowser.trim()) {
      const t = setTimeout(() => setActive((i) => i + 1), 80);
      return () => clearTimeout(t);
    }
    const utt = new SpeechSynthesisUtterance(cleanForBrowser);
    utt.lang = lang;
    utt.onboundary = (ev) => {
      if (ev.name === "word" && ev.charLength) setWord({ start: ev.charIndex, length: ev.charLength });
    };
    utt.onend = () => { setWord(null); setActive((i) => (i < entries.length ? i + 1 : i)); };
    utt.onerror = () => setWord(null);
    const t = setTimeout(() => window.speechSynthesis.speak(utt), 80);
    return () => { clearTimeout(t); window.speechSynthesis.cancel(); setWord(null); };
  }, [active, paused, sceneIdx, lang, entries, currentScene.sort_order]);

  // ── Reset on scene change ─────────────────────────────────────────────────
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    stopWaveform();
    setIsAiActive(false);
    setWord(null);
    setActive(-1);
    setPaused(false);
  }, [sceneIdx]);

  // ── Scroll active into view ───────────────────────────────────────────────
  useEffect(() => {
    if (active >= 0) activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function handler(ev: KeyboardEvent) {
      const tag = (ev.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (ev.code === "Space" || ev.code === "ArrowRight" || ev.code === "ArrowDown") { ev.preventDefault(); skip(); }
      if (ev.code === "KeyR") { ev.preventDefault(); restart(); }
      if ((ev.code === "Escape" || ev.code === "KeyP") && started && !done) setPaused((p) => !p);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, done]);

  function skip() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    stopWaveform();
    setIsAiActive(false);
    setWord(null);
    setPaused(false);
    setActive((i) => (i < 0 ? 0 : i < entries.length ? i + 1 : i));
  }

  function restart() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    stopWaveform();
    setIsAiActive(false);
    setWord(null);
    setActive(0);
    setPaused(false);
  }

  // ── Scene download button ─────────────────────────────────────────────────
  function SceneAudioButton() {
    // 1. Actively downloading
    if (sceneDownloading) {
      const p = sceneDownloadProgress;
      return (
        <button
          disabled
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 999,
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.4,
            color: "var(--accent)",
            border: "1px solid color-mix(in oklch, var(--accent) 40%, transparent)",
            background: "color-mix(in oklch, var(--accent) 8%, transparent)",
            cursor: "default", flexShrink: 0,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeDasharray="14" strokeDashoffset="4" />
          </svg>
          {p ? `${p.done}/${p.total}` : "…"}
        </button>
      );
    }

    // 2. Analysis not done yet — block download
    if (!analysisReady) {
      return (
        <button
          disabled
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 999,
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.4,
            color: "var(--ink-faint)",
            border: "1px solid var(--rule)",
            background: "transparent",
            cursor: "default", flexShrink: 0, opacity: 0.7,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" style={{ animation: "spin 2s linear infinite", opacity: 0.5 }}>
            <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeDasharray="14" strokeDashoffset="4" />
          </svg>
          Analyzing…
        </button>
      );
    }

    // 3. Has generation errors
    if (sceneErrorCount > 0) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {sceneCachedCount > 0 && (
            <span style={{
              display: "flex", alignItems: "center", gap: 3, padding: "2px 8px",
              borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 9,
              letterSpacing: 0.4, color: "var(--accent)", flexShrink: 0,
              border: "1px solid color-mix(in oklch, var(--accent) 35%, transparent)",
              background: "color-mix(in oklch, var(--accent) 8%, transparent)",
            }}>
              <svg width="5" height="5" viewBox="0 0 5 5"><circle cx="2.5" cy="2.5" r="2.5" fill="currentColor" /></svg>
              AI {sceneCachedCount}
            </span>
          )}
          <button
            onClick={downloadScene}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
              borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.4,
              color: "var(--rose)",
              border: "1px solid color-mix(in oklch, var(--rose) 40%, transparent)",
              background: "color-mix(in oklch, var(--rose) 8%, transparent)",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M4 1.5v3M4 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M1 7h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {sceneErrorCount} failed — retry
          </button>
        </div>
      );
    }

    // 4. All complete
    if (sceneManifestEntries.length > 0 && sceneCachedCount >= sceneManifestEntries.length) {
      return (
        <span style={{
          display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
          borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 9,
          letterSpacing: 0.4, color: "var(--accent)", flexShrink: 0,
          border: "1px solid color-mix(in oklch, var(--accent) 35%, transparent)",
          background: "color-mix(in oklch, var(--accent) 8%, transparent)",
        }}>
          <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>
          AI
        </span>
      );
    }

    // 5. Download needed
    const label = sceneManifestEntries.length > 0
      ? `AI ${sceneCachedCount}/${sceneManifestEntries.length}`
      : "AI voices";
    return (
      <button
        onClick={downloadScene}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "2px 8px",
          borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.4,
          color: "var(--ink-faint)", border: "1px solid var(--rule)",
          background: "transparent", cursor: "pointer", flexShrink: 0,
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M4 1v4.5M2 4l2 2 2-2M1 7h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {label}
      </button>
    );
  }

  // ── Download error pill ───────────────────────────────────────────────────
  function DownloadErrorPill() {
    if (!downloadError) return null;
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "2px 8px", borderRadius: 999,
        fontFamily: "var(--font-mono)", fontSize: 9,
        color: "var(--rose)", flexShrink: 0,
        border: "1px solid color-mix(in oklch, var(--rose) 35%, transparent)",
        background: "color-mix(in oklch, var(--rose) 8%, transparent)",
      }}>
        <span>⚠</span>
        {downloadError}
      </div>
    );
  }

  // ── Scene strip ───────────────────────────────────────────────────────────
  const sceneStrip = (() => {
    const groups: Array<{ act: string; indices: number[] }> = [];
    scenes.forEach((s, i) => {
      const last = groups[groups.length - 1];
      if (!last || last.act !== s.act) groups.push({ act: s.act, indices: [i] });
      else last.indices.push(i);
    });
    const multipleActs = groups.length > 1;
    const activeGroupIdx = groups.findIndex((g) => g.indices.includes(sceneIdx));

    return groups.map((group, gi) => {
      const isActiveGroup = gi === activeGroupIdx;
      const soleScene = group.indices.length === 1 ? scenes[group.indices[0]] : null;
      const isBareAct = !!(soleScene && !soleScene.title && !soleScene.scene && group.act);

      if (isBareAct) {
        const s = soleScene!;
        const isActive = group.indices[0] === sceneIdx;
        const hasRole = sceneHasRole(s, roles);
        return (
          <div key={gi} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {gi > 0 && <div style={{ width: 1, height: 18, background: "var(--rule)", flexShrink: 0, margin: "0 8px" }} />}
            <button onClick={() => setSceneIdx(group.indices[0])} style={{
              flexShrink: 0, padding: "3px 10px", borderRadius: "var(--radius-md)",
              fontSize: 12, fontWeight: 500, fontFamily: "var(--font-display)",
              fontStyle: isActive ? "italic" : "normal",
              background: isActive ? "var(--highlight-soft)" : "transparent",
              color: isActive ? "var(--accent)" : hasRole ? "var(--accent)" : "var(--ink-faint)",
              border: "none", cursor: "pointer", whiteSpace: "nowrap",
              opacity: isActive ? 1 : hasRole ? 0.85 : 1,
            }}>{group.act}</button>
          </div>
        );
      }

      return (
        <div key={gi} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {multipleActs && gi > 0 && <div style={{ width: 1, height: 18, background: "var(--rule)", flexShrink: 0, margin: "0 8px" }} />}
          {multipleActs && group.act && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase",
              letterSpacing: 1, color: isActiveGroup ? "var(--bg)" : "var(--ink-muted)",
              background: isActiveGroup ? "var(--accent)" : "var(--line)",
              border: `1px solid ${isActiveGroup ? "var(--accent)" : "var(--rule)"}`,
              borderRadius: "var(--radius-sm)", padding: "1px 6px",
              flexShrink: 0, marginRight: 4, userSelect: "none",
            }}>{group.act}</span>
          )}
          {group.indices.map((i) => {
            const s = scenes[i];
            const isActive = i === sceneIdx;
            const hasRole = sceneHasRole(s, roles);
            return (
              <button key={s.id} onClick={() => setSceneIdx(i)} style={{
                flexShrink: 0, padding: "3px 10px", borderRadius: "var(--radius-md)",
                fontSize: 12, fontWeight: 500, fontFamily: "var(--font-display)",
                fontStyle: isActive ? "italic" : "normal",
                background: isActive ? "var(--highlight-soft)" : "transparent",
                color: isActive ? "var(--accent)" : hasRole ? "var(--accent)" : "var(--ink-faint)",
                border: "none", cursor: "pointer", whiteSpace: "nowrap",
                opacity: isActive ? 1 : hasRole ? 0.85 : 1,
              }}>{sceneLabel(s)}</button>
            );
          })}
        </div>
      );
    });
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Scene strip */}
      <div style={{
        height: 38, flexShrink: 0, display: "flex", alignItems: "center",
        borderBottom: "1px solid var(--rule)", background: "var(--bg-elev)",
      }}>
        <button onClick={() => setSceneIdx((i) => i - 1)} disabled={!hasPrev} style={{
          width: 36, height: "100%", flexShrink: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "none", border: "none", borderRight: "1px solid var(--rule)",
          cursor: hasPrev ? "pointer" : "default", opacity: hasPrev ? 1 : 0.2, color: "var(--ink-muted)",
        }}>
          <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
            <Chev size={12} color="currentColor" />
          </span>
        </button>

        <div style={{
          flex: 1, overflow: "auto", display: "flex", alignItems: "center",
          gap: 0, padding: "0 8px", scrollbarWidth: "none",
        }}>
          {sceneStrip}
        </div>

        {/* Scene audio controls */}
        <div style={{ padding: "0 6px", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <DownloadErrorPill />
          <SceneAudioButton />
        </div>

        <button onClick={() => setSceneIdx((i) => i + 1)} disabled={!hasNext} style={{
          width: 36, height: "100%", flexShrink: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "none", border: "none", borderLeft: "1px solid var(--rule)",
          cursor: hasNext ? "pointer" : "default", opacity: hasNext ? 1 : 0.2, color: "var(--ink-muted)",
        }}>
          <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}>
            <Chev size={12} color="currentColor" />
          </span>
        </button>
      </div>

      {/* Banner — AI coverage notification */}
      {banner && (
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
          padding: "7px 16px",
          background: "color-mix(in oklch, var(--accent) 8%, var(--bg-elev))",
          borderBottom: "1px solid color-mix(in oklch, var(--accent) 20%, transparent)",
          fontFamily: "var(--font-body)", fontSize: 12,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6" cy="6" r="5.5" stroke="var(--accent)" />
            <path d="M6 5v4M6 3.5v.5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span style={{ color: "var(--ink)", flex: 1 }}>
            {banner.ai > 0
              ? <><span style={{ color: "var(--accent)", fontWeight: 600 }}>AI voices: {banner.ai} lines</span>{" · "}<span style={{ color: "var(--ink-muted)" }}>{banner.browser} will use your browser's voice</span></>
              : <span style={{ color: "var(--ink-muted)" }}>No AI voices cached for this scene — browser voice will be used</span>
            }
          </span>
          {!sceneDownloading && sceneManifestEntries.length < sceneLineCount && (
            <button onClick={downloadScene} style={{
              padding: "2px 10px", borderRadius: 999, border: "1px solid var(--accent)",
              background: "transparent", color: "var(--accent)", fontFamily: "var(--font-mono)",
              fontSize: 9, letterSpacing: 0.5, cursor: "pointer", flexShrink: 0,
            }}>Download</button>
          )}
          <button onClick={() => setBanner(null)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-faint)", padding: 2, flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Script scroll */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px clamp(16px, 6vw, 72px) 0" }}>
        {currentScene.title && (
          <div style={{
            fontFamily: "var(--font-display)", fontStyle: "italic",
            fontSize: 22, fontWeight: 500, color: "var(--ink)",
            marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid var(--rule)",
          }}>
            {currentScene.title.replace(/^Scene\s+\d+\s*:\s*/i, "")}
          </div>
        )}

        <div
          className={isSceneLoading ? "souffleur-scene-audio-loading" : undefined}
          style={{ display: "flex", flexDirection: "column", paddingBottom: 40 }}
        >
          {entries.map((e, i) => {
            const isPast = started && i < active;
            const isActive = started && i === active && !done;
            const speechText = isActive ? extractFullSpeechText(e) : "";

            const audioBadgeState: "idle" | "loading" | "generating" | "done" | "error" =
              e.isLine && !isActive
                ? isLineCached(e) ? "done"
                : isLineLoading(e) ? "loading"
                : isLineGenerating(e) ? "generating"
                : isLineError(e) ? "error"
                : "idle"
                : "idle";

            // On the active line, show "AI" or "Browser" inline after char name
            const showVoiceLabel = isActive && e.isLine;

            return (
              <div
                key={i}
                ref={isActive ? activeRef : undefined}
                onClick={isActive ? skip : undefined}
                style={{
                  opacity: isPast ? 0.22 : !started || isActive ? 1 : 0.65,
                  transition: "opacity 0.25s, background 0.2s, box-shadow 0.2s",
                  cursor: isActive ? "pointer" : "default",
                  borderRadius: "var(--radius-sm)",
                  ...(isActive && e.isLine ? {
                    background: e.isYou
                      ? "var(--highlight-soft)"
                      : "color-mix(in oklch, var(--ink) 5%, var(--bg))",
                    boxShadow: e.isYou ? "inset 4px 0 0 var(--highlight)" : "inset 4px 0 0 var(--rule)",
                    padding: "10px 16px", marginLeft: -16, marginRight: -16, marginBottom: 4,
                  } : e.isLine ? {
                    padding: "5px 16px", marginLeft: -16, marginRight: -16,
                  } : { padding: "3px 0" }),
                }}
              >
                {e.isLine ? (
                  <div>
                    {e.showChar && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                          textTransform: "uppercase", letterSpacing: 1.5,
                          color: isActive && e.isYou ? "var(--accent)" : "var(--ink-faint)",
                        }}>
                          {e.content.ch}
                        </span>
                        {/* Non-active lines: AI badge or browser/error badge */}
                        {!isActive && (
                          <LineAudioBadge
                            state={audioBadgeState}
                            onRetry={downloadScene}
                            debugInfo={lineDebugRef.current.get(`${currentScene.sort_order}:${e.contentIdx}`)}
                          />
                        )}
                        {/* Active line: voice mode indicator */}
                        {showVoiceLabel && (
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 0.5,
                            color: isAiActive ? "var(--accent)" : "var(--ink-faint)",
                            opacity: 0.8,
                          }}>
                            {isAiActive ? "AI" : "Browser"}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{
                      fontFamily: "var(--font-display)", fontSize: 17,
                      lineHeight: 1.6, color: "var(--ink)",
                    }}>
                      <LineText
                        entry={e.content}
                        speechText={speechText}
                        wordStart={word?.start ?? 0}
                        wordLen={isActive ? (word?.length ?? 0) : 0}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    fontFamily: "var(--font-display)", fontStyle: "italic",
                    fontSize: 14, color: "var(--ink-faint)", lineHeight: 1.5,
                  }}>
                    ({e.content.text})
                  </div>
                )}
              </div>
            );
          })}

          {done && (
            <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
              <div style={{
                fontFamily: "var(--font-display)", fontStyle: "italic",
                fontSize: 16, color: "var(--ink-faint)", marginBottom: 20,
              }}>
                {t("practice.endOfScene")}
              </div>
              <button onClick={restart} style={{
                padding: "8px 24px", background: "var(--ink)", color: "var(--bg)",
                border: "none", borderRadius: 999, fontFamily: "var(--font-body)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {t("practice.runAgain")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        flexShrink: 0, height: 56, borderTop: "1px solid var(--rule)",
        background: "var(--bg-elev)", display: "flex", alignItems: "center",
        padding: "0 16px", gap: 8,
      }}>
        {started && !done && (
          <button
            onClick={() => {
              if ("speechSynthesis" in window) window.speechSynthesis.cancel();
              audioRef.current?.pause();
              stopWaveform();
              setIsAiActive(false);
              setWord(null);
              setActive(-1);
              setPaused(false);
            }}
            title="Stop and go back to start"
            style={{
              width: 30, height: 30, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              background: "none", border: "1px solid var(--rule)",
              borderRadius: 999, cursor: "pointer", color: "var(--ink-faint)",
              padding: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="1" y="1" width="8" height="8" rx="1.5" fill="currentColor" />
            </svg>
          </button>
        )}

        {started && !done && (
          <button onClick={() => setPaused((p) => !p)} style={{
            padding: "6px 14px",
            background: paused ? "var(--ink)" : "none",
            border: `1px solid ${paused ? "var(--ink)" : "var(--rule)"}`,
            borderRadius: 999, fontFamily: "var(--font-body)", fontSize: 12,
            color: paused ? "var(--bg)" : "var(--ink-muted)", cursor: "pointer",
          }}>
            {paused ? t("practice.resume") : t("practice.pause")}
          </button>
        )}

        {/* Center: waveform — always mounted, fades in/out via opacity so it doesn't snap */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          opacity: isAiActive ? 0.85 : 0,
          transition: "opacity 0.7s ease",
          pointerEvents: "none",
        }}>
          <WaveformCanvas canvasRef={waveformCanvasRef} />
        </div>

        {!done && (
          <button onClick={skip} style={{
            padding: "8px 22px", background: "var(--ink)", color: "var(--bg)",
            border: "none", borderRadius: 999, fontFamily: "var(--font-body)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            {!started ? t("practice.start") : t("practice.skip")}
          </button>
        )}

        {done && hasNext && (
          <button onClick={() => setSceneIdx((i) => i + 1)} style={{
            padding: "8px 22px", background: "var(--ink)", color: "var(--bg)",
            border: "none", borderRadius: 999, fontFamily: "var(--font-body)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            {t("practice.nextScene")}
          </button>
        )}
      </div>
    </div>
  );
}
