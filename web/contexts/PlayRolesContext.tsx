"use client";

import { createContext, useContext, useState } from "react";

interface PlayRolesContextValue {
  roles: string[];
  setRoles: (roles: string[]) => void;
}

const PlayRolesContext = createContext<PlayRolesContextValue>({
  roles: [],
  setRoles: () => {},
});

export function PlayRolesProvider({
  initialRoles,
  children,
}: {
  initialRoles: string[];
  children: React.ReactNode;
}) {
  const [roles, setRoles] = useState<string[]>(initialRoles);
  return (
    <PlayRolesContext.Provider value={{ roles, setRoles }}>
      {children}
    </PlayRolesContext.Provider>
  );
}

export function usePlayRoles() {
  return useContext(PlayRolesContext);
}
