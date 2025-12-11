// nextjs/app/teams/[teamId]/page.tsx

import { notFound } from "next/navigation";
import { TeamSummaryHeader, TeamStatsTable } from "@/components/team/TeamSummary";
import type { TeamSummaryDTO } from "@/app/api/teamSummary/route";

type TeamPageProps = {
  params: { teamId: string };
};

/**
 * Server-side fetch helper for the team summary API.
 */
async function fetchTeamSummary(teamId: string): Promise<TeamSummaryDTO | null> {
  // Determine correct base URL in production (Vercel) or local dev
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000");

  const url = `${baseUrl}/api/teamSummary?teamId=${encodeURIComponent(teamId)}`;

  const res = await fetch(url, {
    cache: "no-store", // always fresh
  });

  if (!res.ok) {
    if (res.status === 404) return null;

    console.error("Error fetching team summary:", res.status, await res.text());
    return null;
  }

  return (await res.json()) as TeamSummaryDTO;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = params;

  // Fetch summary from our API route → RPC → Supabase
  const summary = await fetchTeamSummary(teamId);

  if (!summary) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 flex flex-col gap-6">

      {/* TEAM HEADER SUMMARY CARD */}
      <TeamSummaryHeader summary={summary} />

      {/* TEAM STATS TABLE (OFFENSE TOTALS) */}
      <TeamStatsTable summary={summary} />

      {/* PLACEHOLDER - we will add tabs here shortly */}
      {/* 
        <TeamTabs teamId={teamId} />
      */}

    </div>
  );
}
