"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Play } from "@/lib/script-types";

export function useRealtimePlays(initialPlays: Play[]): Play[] {
  const [plays, setPlays] = useState<Play[]>(initialPlays);
  const router = useRouter();

  // Sync when SSR pushes new initial data (e.g. after router.refresh())
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs plays when server refreshes initial data
    setPlays(initialPlays);
  }, [initialPlays]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`library-user-plays-${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_plays" },
        (payload) => {
          const updated = payload.new as {
            id: string;
            state: string;
            progress: number | null;
          };

          setPlays((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? {
                    ...p,
                    state: updated.state as Play["state"],
                    progress: updated.progress ?? undefined,
                  }
                : p
            )
          );

          // When analysis completes, refresh to pull in the description
          // from play_ai_analysis (which the Realtime payload doesn't include)
          if (updated.state === "ready") {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return plays;
}
