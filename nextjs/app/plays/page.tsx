"use server";

import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type PlayExplorerProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

// Distance-to-first-down bins
function inDistToGoBin(distance: number | null, bin: string): boolean {
  if (distance == null) return false;
  switch (bin) {
    case "1":
      return distance === 1;
    case "2":
      return distance === 2;
    case "3-4":
      return distance >= 3 && distance <= 4;
    case "5-7":
      return distance >= 5 && distance <= 7;
    case "8-10":
      return distance >= 8 && distance <= 10;
    case "11-13":
      return distance >= 11 && distance <= 13;
    case "14-20":
      return distance >= 14 && distance <= 20;
    case "21+":
      return distance >= 21;
    default:
      return true;
  }
}

// Distance-to-goal bins (0–9, 10–19, ..., 90–99)
function inFieldPosBin(yardsToGoal: number | null, bin: string): boolean {
  if (yardsToGoal == null) return false;
  if (bin === "") return true;

  if (bin === "0-9") return yardsToGoal >= 0 && yardsToGoal <= 9;
  if (bin === "10-19") return yardsToGoal >= 10 && yardsToGoal <= 19;
  if (bin === "20-29") return yardsToGoal >= 20 && yardsToGoal <= 29;
  if (bin === "30-39") return yardsToGoal >= 30 && yardsToGoal <= 39;
  if (bin === "40-49") return yardsToGoal >= 40 && yardsToGoal <= 49;
  if (bin === "50-59") return yardsToGoal >= 50 && yardsToGoal <= 59;
  if (bin === "60-69") return yardsToGoal >= 60 && yardsToGoal <= 69;
  if (bin === "70-79") return yardsToGoal >= 70 && yardsToGoal <= 79;
  if (bin === "80-89") return yardsToGoal >= 80 && yardsToGoal <= 89;
  if (bin === "90-99") return yardsToGoal >= 90 && yardsToGoal <= 99;

  return true;
}

export default async function PlayExplorerPage({
  searchParams,
}: PlayExplorerProps) {
  // Next.js 16: searchParams is a Promise
  const sp = await searchParams;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold">Play Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable this
          page.
        </p>
      </div>
    );
  }

  const selectedTeam = sp.teamId || "";
  const selectedDown = sp.down || "";
  const selectedPlayType = sp.playType || "";
  const selectedRedzone = sp.redzone || "";
  const selectedQuarter = sp.quarter || "";
  const selectedWeek = sp.week || "";
  const selectedDistToGoBin = sp.distToGo || "";
  const selectedFieldPosBin = sp.fieldPos || "";

  // 1) Load teams for dropdown
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, display_name")
    .order("id");

  if (teamsError) {
    console.error("Teams fetch error:", teamsError);
  }

  // 2) Build base plays query with simple DB-side filters
  let query = supabase.from("plays").select("*").limit(500);

  if (selectedTeam) {
    // offense team is stored in team_id
    query = query.eq("team_id", selectedTeam);
  }

  if (selectedDown) {
    query = query.eq("down", Number(selectedDown));
  }

  if (selectedPlayType) {
    // your schema uses 'play_type'
    query = query.eq("play_type", selectedPlayType);
  }

  if (selectedRedzone === "1") {
    query = query.lte("yards_to_goal", 20);
  }

  if (selectedQuarter) {
    query = query.eq("quarter", Number(selectedQuarter));
  }

  query = query
    .order("game_id", { ascending: true })
    .order("sequence", { ascending: true });

  const { data: playsRaw, error: playsError } = await query;

  if (playsError) {
    console.error("Plays fetch error:", playsError);
  }

  let plays = playsRaw || [];

  // 3) Apply distance-based filters in JS
  if (selectedDistToGoBin) {
    plays = plays.filter((p: any) =>
      inDistToGoBin(p.distance ?? null, selectedDistToGoBin)
    );
  }

  if (selectedFieldPosBin) {
    plays = plays.filter((p: any) =>
      inFieldPosBin(p.yards_to_goal ?? null, selectedFieldPosBin)
    );
  }

  // 4) Load games for these plays so we can show/filter by week
  const gameIds = Array.from(new Set(plays.map((p: any) => p.game_id)));

  const gameLookup: Record<string, any> = {};
  if (gameIds.length > 0) {
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, week, season")
      .in("id", gameIds);

    if (gamesError) {
      console.error("Games fetch error:", gamesError);
    } else {
      for (const g of games || []) {
        gameLookup[g.id] = g;
      }
    }
  }

  // Apply week filter after we know game.week
  if (selectedWeek) {
    const weekNum = Number(selectedWeek);
    plays = plays.filter((p: any) => {
      const g = gameLookup[p.game_id];
      return g?.week === weekNum;
    });
  }

  // Helper: map team id to name
  const teamNameMap: Record<string, string> = {};
  for (const t of teams || []) {
    teamNameMap[t.id] = t.display_name || t.id;
  }

  function playTypeLabel(row: any): string {
    return row.play_type || "Unknown";
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Play Explorer</h1>
        <p className="text-gray-600 text-sm">
          Filter plays by team, down, week, quarter, play type, red zone, 
          distance to first, and distance to goal. This is the foundation 
          for more advanced analytics (shotgun vs under center, QB hits, 
          player touched, EPA, etc.).
        </p>
      </header>

      {/* Filters */}
      <section className="border rounded-lg p-4 bg-gray-50 space-y-3">
        <h2 className="font-semibold text-lg">Filters</h2>

        <form className="flex flex-wrap gap-4 items-end" method="GET">
          {/* Team filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Offense Team</label>
            <select
              name="teamId"
              defaultValue={selectedTeam}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All teams</option>
              {(teams || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.display_name || t.id}
                </option>
              ))}
            </select>
          </div>

          {/* Week filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Week</label>
            <select
              name="week"
              defaultValue={selectedWeek}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All weeks</option>
              {Array.from({ length: 18 }).map((_, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  Week {idx + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Quarter filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Quarter</label>
            <select
              name="quarter"
              defaultValue={selectedQuarter}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Any</option>
              <option value="1">1st</option>
              <option value="2">2nd</option>
              <option value="3">3rd</option>
              <option value="4">4th</option>
              <option value="5">OT</option>
            </select>
          </div>

          {/* Down filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Down</label>
            <select
              name="down"
              defaultValue={selectedDown}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Any down</option>
              <option value="1">1st</option>
              <option value="2">2nd</option>
              <option value="3">3rd</option>
              <option value="4">4th</option>
            </select>
          </div>

          {/* Play type filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Play Type</label>
            <select
              name="playType"
              defaultValue={selectedPlayType}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Any type</option>
              <option value="pass">Pass</option>
              <option value="rush">Rush</option>
              <option value="sack">Sack</option>
              <option value="scramble">Scramble</option>
              <option value="penalty">Penalty</option>
              <option value="field-goal">Field Goal</option>
              <option value="punt">Punt</option>
              <option value="kickoff">Kickoff</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Redzone filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Red Zone</label>
            <select
              name="redzone"
              defaultValue={selectedRedzone}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All plays</option>
              <option value="1">Red zone only (≤ 20 yards)</option>
            </select>
          </div>

          {/* Distance to first down bins */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Distance to First
            </label>
            <select
              name="distToGo"
              defaultValue={selectedDistToGoBin}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Any</option>
              <option value="1">1 yard</option>
              <option value="2">2 yards</option>
              <option value="3-4">3–4 yards</option>
              <option value="5-7">5–7 yards</option>
              <option value="8-10">8–10 yards</option>
              <option value="11-13">11–13 yards</option>
              <option value="14-20">14–20 yards</option>
              <option value="21+">21+ yards</option>
            </select>
          </div>

          {/* Distance to goal bins */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Distance to Goal
            </label>
            <select
              name="fieldPos"
              defaultValue={selectedFieldPosBin}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Any</option>
              <option value="0-9">0–9 yards</option>
              <option value="10-19">10–19 yards</option>
              <option value="20-29">20–29 yards</option>
              <option value="30-39">30–39 yards</option>
              <option value="40-49">40–49 yards</option>
              <option value="50-59">50–59 yards</option>
              <option value="60-69">60–69 yards</option>
              <option value="70-79">70–79 yards</option>
              <option value="80-89">80–89 yards</option>
              <option value="90-99">90–99 yards</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-800"
          >
            Apply
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-2">
          Results are limited to 500 plays for now. We can add pagination,
          team-specific views, shotgun vs under center, player filters, and
          advanced metrics once this foundation is stable.
        </p>
      </section>

      {/* Results */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Matching Plays ({plays.length})
        </h2>

        {plays.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No plays found for the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="p-2 border">Game</th>
                  <th className="p-2 border">Week</th>
                  <th className="p-2 border">Q</th>
                  <th className="p-2 border">Clock</th>
                  <th className="p-2 border">Off</th>
                  <th className="p-2 border">Def</th>
                  <th className="p-2 border">Down &amp; Dist</th>
                  <th className="p-2 border">YTG</th>
                  <th className="p-2 border">Gain</th>
                  <th className="p-2 border">Type</th>
                  <th className="p-2 border">Description</th>
                </tr>
              </thead>
              <tbody>
                {plays.map((p: any) => {
                  const g = gameLookup[p.game_id];
                  const week = g?.week ?? null;

                  return (
                    <tr
                      key={p.id}
                      className="border-b hover:bg-gray-50 align-top"
                    >
                      <td className="p-2 border">
                        <Link href={`/games/${p.game_id}`}>
                          <span className="text-blue-500 hover:underline">
                            {p.game_id}
                          </span>
                        </Link>
                      </td>
                      <td className="p-2 border text-center">
                        {week ?? "—"}
                      </td>
                      <td className="p-2 border text-center">
                        {p.quarter ?? "—"}
                      </td>
                      <td className="p-2 border text-center">
                        {p.clock || ""}
                      </td>
                      <td className="p-2 border">
                        {teamNameMap[p.team_id] || p.team_id || "—"}
                      </td>
                      <td className="p-2 border">
                        {teamNameMap[p.defense_team_id] ||
                          p.defense_team_id ||
                          "—"}
                      </td>
                      <td className="p-2 border text-center">
                        {p.down
                          ? `${p.down} & ${p.distance ?? "?"}`
                          : "—"}
                      </td>
                      <td className="p-2 border text-center">
                        {p.yards_to_goal ?? "—"}
                      </td>
                      <td className="p-2 border text-center">
                        {p.yards_gained ?? p.raw?.statYardage ?? "—"}
                      </td>
                      <td className="p-2 border">
                        {playTypeLabel(p)}
                      </td>
                      <td className="p-2 border max-w-xl">
                        {p.description || p.raw?.text || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
