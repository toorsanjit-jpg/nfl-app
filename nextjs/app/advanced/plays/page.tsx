// nextjs/app/advanced/plays/page.tsx
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type PlaysPageProps = {
  searchParams?: {
    team?: string;
    season?: string;
    groupBy?: string;
  };
};

export default function AdvancedPlaysPage({ searchParams }: PlaysPageProps) {
  const team = searchParams?.team ?? "";
  const season = searchParams?.season ?? "";
  const groupBy = searchParams?.groupBy ?? "totals";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-xl font-semibold">Filtered Plays</h1>
        <p className="text-xs text-muted-foreground">
          This page will show the exact plays behind your advanced filters.
          Right now it&apos;s a placeholder so the navigation works end-to-end.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Plays view backend not wired yet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Team ID:</strong> {team || "All"}
          </p>
          <p>
            <strong>Season:</strong> {season || "All"}
          </p>
          <p>
            <strong>View:</strong> {groupBy}
          </p>
          <p>
            Next step is to connect this page to{" "}
            <code>nfl_plays</code> with the same filters used on the
            Advanced Offense table, so you can see every individual snap.
          </p>
          <Link href="/advanced" className="text-xs underline">
            ← Back to Advanced Stats
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
