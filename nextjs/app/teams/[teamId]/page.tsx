// Team detail page
import { TeamSummary } from "@/components/team/teamsummary";

type TeamPageProps = {
  params: { teamId: string };
};

export default function TeamPage({ params }: TeamPageProps) {
  const { teamId } = params;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <TeamSummary teamId={teamId} />
      {/* Future: add tabs/other team detail sections here. */}
    </div>
  );
}
