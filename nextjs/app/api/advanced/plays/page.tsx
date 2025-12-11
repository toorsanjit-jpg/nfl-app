// nextjs/app/advanced/plays/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type PlaysPageProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

type PlayRow = {
  play_id: number;
  game_id: number;
  season: number | null;
  week: number | null;
  offense_team_id: string | null;
  offense_team_name: string | null;
  defense_team_id: string | null;
  defense_team_name: string | null;
  quarter: number | null;
  clock: string | null;
  down: number | null;
  distance: number | null;
  yard_line: string | null;
  start_yardline: number | null;
  result_yards: number | null;
  play_type: string | null;
  calc_play_result: string | null;
  description: string | null;
  // enriched bits (not all shown yet – for premium)
  en_ngs_off_formation?: string | null;
  en_rbs?: number | null;
  en_tes?: number | null;
  en_wrs?: number | null;
  en_coverage_single_high?: boolean | null;
  en_coverage_two_high?: boolean | null;
  en_coverage_zero?: boolean | null;
};

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function fetchPlays(params: URLSearchParams): Promise<PlayRow[]> {
  const base = getBaseUrl();

  const res = await fetch(`${base}/api/advanced/plays?${params.toString()}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error("Failed to fetch plays:", res.status, await res.text());
    return [];
  }

  const json = (await res.json()) as { plays: PlayRow[] };
  return json.plays || [];
}

function pillHref(
  basePath: string,
  current: URLSearchParams,
  key: string,
  value: string | null
) {
  const next = new URLSearchParams(current.toString());

  if (value === null) {
    next.delete(key);
  } else {
    next.set(key, value);
  }

  return `${basePath}?${next.toString()}`;
}

export default async function AdvancedPlaysPage({ searchParams }: PlaysPageProps) {
  const params = new URLSearchParams();

  // REQUIRED: teamId
  const teamIdRaw = searchParams.teamId;
  const teamId =
    typeof teamIdRaw === "string" ? teamIdRaw : Array.isArray(teamIdRaw) ? teamIdRaw[0] : null;

  if (!teamId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Filtered Plays</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Missing <code>teamId</code> query parameter.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  params.set("teamId", teamId);

  const seasonRaw = searchParams.season;
  if (typeof seasonRaw === "string") {
    params.set("season", seasonRaw);
  }

  const downRaw = searchParams.down;
  if (typeof downRaw === "string") {
    params.set("down", downRaw);
  }

  const quarterRaw = searchParams.quarter;
  if (typeof quarterRaw === "string") {
    params.set("quarter", quarterRaw);
  }

  const playResultRaw = searchParams.playResult;
  if (typeof playResultRaw === "string") {
    params.set("playResult", playResultRaw);
  }

  const plays = await fetchPlays(params);

  // current filter values (for UI state)
  const season = typeof seasonRaw === "string" ? seasonRaw : undefined;
  const down = typeof downRaw === "string" ? downRaw : undefined;
  const quarter = typeof quarterRaw === "string" ? quarterRaw : undefined;
  const playResult = typeof playResultRaw === "string" ? playResultRaw : undefined;

  const teamLabel =
    plays[0]?.offense_team_name || plays[0]?.offense_team_id || teamId;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              {teamLabel} – Filtered Offense Plays
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {season ? `Season ${season}` : "All seasons"} · {plays.length} plays
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Plays View</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter pills row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Down */}
            <span className="font-semibold text-muted-foreground">Down:</span>
            <Link
              href={pillHref("/advanced/plays", params, "down", null)}
              className={`rounded-full border px-3 py-1 ${
                !down ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              All
            </Link>
            {[1, 2, 3, 4].map((d) => (
              <Link
                key={d}
                href={pillHref("/advanced/plays", params, "down", String(d))}
                className={`rounded-full border px-3 py-1 ${
                  down === String(d)
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {d}
              </Link>
            ))}

            {/* Quarter */}
            <span className="ml-4 font-semibold text-muted-foreground">Quarter:</span>
            <Link
              href={pillHref("/advanced/plays", params, "quarter", null)}
              className={`rounded-full border px-3 py-1 ${
                !quarter ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              All
            </Link>
            {[1, 2, 3, 4].map((q) => (
              <Link
                key={q}
                href={pillHref("/advanced/plays", params, "quarter", String(q))}
                className={`rounded-full border px-3 py-1 ${
                  quarter === String(q)
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                Q{q}
              </Link>
            ))}

            {/* Play type */}
            <span className="ml-4 font-semibold text-muted-foreground">Type:</span>
            <Link
              href={pillHref("/advanced/plays", params, "playResult", null)}
              className={`rounded-full border px-3 py-1 ${
                !playResult ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              All
            </Link>
            {["pass", "run", "sack", "other"].map((kind) => (
              <Link
                key={kind}
                href={pillHref("/advanced/plays", params, "playResult", kind)}
                className={`rounded-full border px-3 py-1 capitalize ${
                  playResult === kind
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {kind}
              </Link>
            ))}
          </div>

          {/* Plays table */}
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Q</TableHead>
                  <TableHead className="w-20 text-center">Clock</TableHead>
                  <TableHead className="w-28">Down &amp; Dist</TableHead>
                  <TableHead className="w-24">LOS</TableHead>
                  <TableHead className="w-20 text-right">Yds</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No plays match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  plays.map((p) => (
                    <TableRow key={p.play_id}>
                      <TableCell className="text-center">
                        {p.quarter ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.clock ?? "-"}
                      </TableCell>
                      <TableCell>
                        {p.down ?? "-"}&nbsp;&amp;&nbsp;{p.distance ?? "-"}
                      </TableCell>
                      <TableCell>{p.yard_line ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        {typeof p.result_yards === "number" ? p.result_yards : "-"}
                      </TableCell>
                      <TableCell className="max-w-xl whitespace-pre-wrap text-sm">
                        {p.description ?? ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* TODO: Later – premium toggle for personnel / formation / coverage columns */}
        </CardContent>
      </Card>
    </div>
  );
}
