"use client";

import { createContext, useContext, useState } from "react";

interface SceneNavContextValue {
  requestedSceneId: string | null;
  requestSceneJump: (sceneId: string) => void;
  clearSceneJump: () => void;
  // Title of the scene the user is currently reading — used to jump the
  // editor to the same heading when they click Edit.
  currentReadSceneTitle: string | null;
  setCurrentReadSceneTitle: (title: string | null) => void;
}

const SceneNavContext = createContext<SceneNavContextValue>({
  requestedSceneId: null,
  requestSceneJump: () => {},
  clearSceneJump: () => {},
  currentReadSceneTitle: null,
  setCurrentReadSceneTitle: () => {},
});

export function SceneNavProvider({ children }: { children: React.ReactNode }) {
  const [requestedSceneId, setRequestedSceneId] = useState<string | null>(null);
  const [currentReadSceneTitle, setCurrentReadSceneTitle] = useState<string | null>(null);
  return (
    <SceneNavContext.Provider
      value={{
        requestedSceneId,
        requestSceneJump: setRequestedSceneId,
        clearSceneJump: () => setRequestedSceneId(null),
        currentReadSceneTitle,
        setCurrentReadSceneTitle,
      }}
    >
      {children}
    </SceneNavContext.Provider>
  );
}

export function useSceneNav() {
  return useContext(SceneNavContext);
}
