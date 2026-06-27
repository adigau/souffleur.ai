// IndexedDB cache for pre-generated Polly audio blobs.
// Key: SHA-256 of character_name|speech_text — client-only module.

import type { WordTimestamp } from "@/lib/ai/polly";

const DB_NAME = "souffleur-audio-v1";
const DB_VERSION = 1;
const STORE = "blobs";

export interface AudioCacheEntry {
  content_hash: string;
  audio_blob: Blob;
  word_timestamps: WordTimestamp[];
  duration_ms: number;
  cached_at: number;
}

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "content_hash" });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedAudio(contentHash: string): Promise<AudioCacheEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(contentHash);
    req.onsuccess = () => resolve((req.result as AudioCacheEntry) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setCachedAudio(
  entry: Omit<AudioCacheEntry, "cached_at">
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE, "readwrite")
      .objectStore(STORE)
      .put({ ...entry, cached_at: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function hasCachedAudio(contentHash: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).count(contentHash);
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror = () => reject(req.error);
  });
}
