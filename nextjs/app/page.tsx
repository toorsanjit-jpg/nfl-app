"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OffenseHome from "@/components/home/OffenseHome";
import DefenseHome from "@/components/home/DefenseHome";
import SpecialTeamsHome from "@/components/home/SpecialTeamsHome";
import AdvancedLanding from "@/components/home/AdvancedLanding";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Tabs defaultValue="offense" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="offense">Offense</TabsTrigger>
          <TabsTrigger value="defense">Defense</TabsTrigger>
          <TabsTrigger value="special">Special Teams</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="offense" className="mt-6">
          <OffenseHome />
        </TabsContent>

        <TabsContent value="defense" className="mt-6">
          <DefenseHome />
        </TabsContent>

        <TabsContent value="special" className="mt-6">
          <SpecialTeamsHome />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedLanding />
        </TabsContent>
      </Tabs>
    </div>
  );
}
