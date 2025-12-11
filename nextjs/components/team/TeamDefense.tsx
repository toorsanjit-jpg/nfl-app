"use client";

import { useEffect, useState } from "react";
import { TeamDefenseSummary } from "@/components/team/TeamDefenseSummary";
import type { TeamDefenseSummaryDTO } from "@/types/TeamDefenseSummary";

export function TeamDefense({ teamId }: { teamId: string }) {
  const [data, setData] = useState<TeamDefenseSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/teamDefenseSummary?teamId=${teamId}`);
        const json = await res.json();
        setData(json.summary || null);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teamId]);

  if (loading) return <p>Loading defense…</p>;

  return <TeamDefenseSummary summary={data!} />;
}
