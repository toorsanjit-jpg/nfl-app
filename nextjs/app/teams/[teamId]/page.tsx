import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { TeamSummary } from "@/components/team/TeamSummary";              // Offense
import { TeamDefenseSummary } from "@/components/team/TeamDefenseSummary"; // Defense
import { TeamSpecial } from "@/components/team/TeamSpecial";               // Special Teams

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold">Team Overview — {teamId.toUpperCase()}</h1>

      {/* --------------------- Tabs --------------------- */}
      <Tabs defaultValue="offense" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="offense">Offense</TabsTrigger>
          <TabsTrigger value="defense">Defense</TabsTrigger>
          <TabsTrigger value="special">Special Teams</TabsTrigger>
        </TabsList>

        {/* --------------------- OFFENSE --------------------- */}
        <TabsContent value="offense" className="mt-4">
          <TeamSummary teamId={teamId} />
        </TabsContent>

        {/* --------------------- DEFENSE --------------------- */}
        <TabsContent value="defense" className="mt-4">
          <TeamDefenseSummary teamId={teamId} />
        </TabsContent>

        {/* --------------------- SPECIAL TEAMS --------------------- */}
        <TabsContent value="special" className="mt-4">
          <TeamSpecial teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
