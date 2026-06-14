"use client";

import { useState, useCallback } from "react";

function key(userPlayId: string, sceneId: string, lineIdx: number) {
  return `souffleur-notes-${userPlayId}-${sceneId}-${lineIdx}`;
}

export function useActorNotes(userPlayId: string, sceneId: string) {
  const [version, setVersion] = useState(0);

  const getNote = useCallback(
    (lineIdx: number): string => {
      if (typeof window === "undefined") return "";
      return localStorage.getItem(key(userPlayId, sceneId, lineIdx)) ?? "";
    },
    [userPlayId, sceneId, version] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setNote = useCallback(
    (lineIdx: number, text: string) => {
      const k = key(userPlayId, sceneId, lineIdx);
      if (text.trim()) {
        localStorage.setItem(k, text.trim());
      } else {
        localStorage.removeItem(k);
      }
      setVersion((v) => v + 1);
    },
    [userPlayId, sceneId]
  );

  return { getNote, setNote };
}
