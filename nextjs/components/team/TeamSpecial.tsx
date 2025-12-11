import { TeamSpecialSummary } from "@/components/team/TeamSpecialSummary";
import type { TeamSpecialSummaryDTO } from "@/types/TeamSpecialSummary";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
}

async function fetchSpecial(teamId: string): Promise<TeamSpecialSummaryDTO | null> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/teamSpecialSummary?teamId=${teamId}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error("Failed to fetch special teams summary:", await res.text());
    return null;
  }

  const json = await res.json();
  return json.summary ?? null;
}

export async function TeamSpecial({ teamId }: { teamId: string }) {
  const summary = await fetchSpecial(teamId);

  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        No special teams data available for this team yet.
      </p>
    );
  }

  return <TeamSpecialSummary summary={summary} />;
}
