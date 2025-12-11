"use client";

import { useEffect, useState } from "react";
import type { TeamSpecialSummaryDTO } from "@/types/TeamSpecialSummary";
import { TeamSpecialSummary } from "@/components/team/TeamSpecialSummary";

export function TeamSpecial({ teamId }: { teamId: string }) {
  const [data, setData] = useState<TeamSpecialSummaryDTO | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/teamSpecialSummary?teamId=${teamId}`);
      const json = await res.json();
      setData(json.summary ?? null);
    }
    load();
  }, [teamId]);

  if (!data) return <p className="text-sm text-muted-foreground">No special teams data.</p>;

  return <TeamSpecialSummary summary={data} />;
}
