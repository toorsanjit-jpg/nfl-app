// nextjs/app/teams/[teamId]/page.tsx

import { notFound } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { TeamSummary } from "@/components/team/teamsummary";

type TeamPageProps = {
  params: { teamId: string };
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = params;

  // No internal validation needed here — TeamSummary handles missing data.
  // But we keep a basic check.
  if (!teamId) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 flex flex-col gap-6">

      {/* TABS layout with Offense first */}
      <Tabs defaultValue="offense" className="w-full">
        <TabsList className="w-full justify-start md:w-auto">
          <TabsTrigger value="offense">Offense</TabsTrigger>
          <TabsTrigger value="defense">Defense</TabsTrigger>
          <TabsTrigger value="special">Special Teams</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* OFFENSE TAB — uses your TeamSummary component */}
        <TabsContent value="offense" className="mt-4">
          <TeamSummary teamId={teamId} />
        </TabsContent>

        {/* DEFENSE TAB — placeholder for now */}
        <TabsContent value="defense" className="mt-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              Defensive summary will go here (team defense view + metrics).
            </p>
          </Card>
        </TabsContent>

        {/* SPECIAL TEAMS TAB */}
        <TabsContent value="special" className="mt-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              Special teams summary (FG, punts, returns) coming soon.
            </p>
          </Card>
        </TabsContent>

        {/* ADVANCED TAB */}
        <TabsContent value="advanced" className="mt-4">
          <Card className="p-4 space-y-2">
            <p className="text-sm font-medium">Advanced Filtering / Custom Stats</p>
            <p className="text-sm text-muted-foreground">
              This will host the TruMedia-style filter builder and custom stat editor.
            </p>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
