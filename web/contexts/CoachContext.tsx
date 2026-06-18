"use client";

import { createContext, useContext } from "react";

const CoachContext = createContext<{ openCoach: () => void }>({ openCoach: () => {} });

export function CoachProvider({
  children,
  openCoach,
}: {
  children: React.ReactNode;
  openCoach: () => void;
}) {
  return <CoachContext.Provider value={{ openCoach }}>{children}</CoachContext.Provider>;
}

export function useCoach() {
  return useContext(CoachContext);
}
