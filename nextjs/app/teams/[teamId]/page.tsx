import { notFound } from "next/navigation";
import { TeamSummaryHeader, TeamStatsTable } from "@/components/team/TeamSummary";
import type { TeamSummaryDTO } from "@/app/api/teamSummary/route";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
};

async function fetchTeamSummary(teamId: string): Promise<TeamSummaryDTO | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/teamSummary?teamId=${encodeURIComponent(teamId)}`,
    {
      // Ensure this always runs on the server and can be revalidated easily
      cache: "no-store",
    }
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    console.error("teamSummary API error:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as TeamSummaryDTO;
  return data;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const summary = await fetchTeamSummary(teamId);

  if (!summary) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <TeamSummaryHeader summary={summary} />
      <TeamStatsTable summary={summary} />
    </div>
  );
}
