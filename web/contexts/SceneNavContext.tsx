"use client";

import { createContext, useContext, useState } from "react";

interface SceneNavContextValue {
  requestedSceneId: string | null;
  requestSceneJump: (sceneId: string) => void;
  clearSceneJump: () => void;
  // Title and ID of the scene the user is currently reading.
  // Title is used to jump the editor to the same heading when they click Edit.
  // ID is used to scope a PDF download to the current scene.
  currentReadSceneTitle: string | null;
  setCurrentReadSceneTitle: (title: string | null) => void;
  currentReadSceneId: string | null;
  setCurrentReadSceneId: (id: string | null) => void;
}

const SceneNavContext = createContext<SceneNavContextValue>({
  requestedSceneId: null,
  requestSceneJump: () => {},
  clearSceneJump: () => {},
  currentReadSceneTitle: null,
  setCurrentReadSceneTitle: () => {},
  currentReadSceneId: null,
  setCurrentReadSceneId: () => {},
});

export function SceneNavProvider({ children }: { children: React.ReactNode }) {
  const [requestedSceneId, setRequestedSceneId] = useState<string | null>(null);
  const [currentReadSceneTitle, setCurrentReadSceneTitle] = useState<string | null>(null);
  const [currentReadSceneId, setCurrentReadSceneId] = useState<string | null>(null);
  return (
    <SceneNavContext.Provider
      value={{
        requestedSceneId,
        requestSceneJump: setRequestedSceneId,
        clearSceneJump: () => setRequestedSceneId(null),
        currentReadSceneTitle,
        setCurrentReadSceneTitle,
        currentReadSceneId,
        setCurrentReadSceneId,
      }}
    >
      {children}
    </SceneNavContext.Provider>
  );
}

export function useSceneNav() {
  return useContext(SceneNavContext);
}
