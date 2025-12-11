import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { TeamSummary } from "@/components/team/TeamSummary";
import { TeamDefenseSummary } from "@/components/team/TeamDefenseSummary";
import { TeamSpecial } from "@/components/team/TeamSpecial";

type TeamPageProps = {
  params: { teamId: string };
};

export default function TeamPage({ params }: TeamPageProps) {
  const { teamId } = params;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold">Team Overview · {teamId.toUpperCase()}</h1>

      <Tabs defaultValue="offense" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="offense">Offense</TabsTrigger>
          <TabsTrigger value="defense">Defense</TabsTrigger>
          <TabsTrigger value="special">Special Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="offense" className="mt-4">
          <TeamSummary teamId={teamId} />
        </TabsContent>

        <TabsContent value="defense" className="mt-4">
          <TeamDefenseSummary teamId={teamId} />
        </TabsContent>

        <TabsContent value="special" className="mt-4">
          <TeamSpecial teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
