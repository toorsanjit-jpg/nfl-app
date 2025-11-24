// supabase/functions/import_finished_games/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Same season as sync_schedule
const CURRENT_SEASON = parseInt(Deno.env.get("NFL_SEASON") ?? "2025", 10);

// Supabase service client (uses your Edge Function secrets)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type ScheduleRow = {
  game_id: string;
  season: number;
  week: number;
  status: string | null;
};

async function getFinishedGames(): Promise<ScheduleRow[]> {
  const { data, error } = await supabase
    .from("game_schedule")
    .select("game_id, season, week, status")
    .eq("season", CURRENT_SEASON)
    .in("status", ["post", "in"]); // you can change this to just ["post"] if you want

  if (error) {
    throw new Error(`Error loading game_schedule: ${error.message}`);
  }

  return (data ?? []) as ScheduleRow[];
}

async function gameAlreadyImported(gameId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("plays")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId);

  if (error) {
    throw new Error(`Error checking plays for ${gameId}: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

async function fetchEspnPlays(gameId: string): Promise<any[]> {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch summary for game ${gameId}: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json();

  const drives: any[] = [];
  const prev = data.drives?.previous ?? [];
  if (Array.isArray(prev)) {
    drives.push(...prev);
  }
  if (data.drives?.current) {
    drives.push(data.drives.current);
  }

  const plays: any[] = [];
  for (const drive of drives) {
    for (const play of drive.plays ?? []) {
      plays.push(play);
    }
  }

  return plays;
}

function normalizePlays(gameId: string, plays: any[]): any[] {
  const rows: any[] = [];

  for (const play of plays) {
    const id = play.id ?? play.sequenceNumber;
    if (!id) continue;

    const period = play.period?.number ?? null;
    const clock = play.clock?.displayValue ?? null;

    const start = play.start ?? {};
    const down = start.down ?? null;
    const distance = start.distance ?? null;
    const yardsToEndzone = start.yardsToEndzone ?? null;
    const yardLine = start.yardLine ?? null;

    const statYardage = play.statYardage ?? null;
    const playType = play.type?.text ?? play.type?.abbreviation ?? "Other";

    rows.push({
      id: String(id),
      game_id: gameId,
      // We don't try to guess team IDs here yet
      team_id: null,
      defense_team_id: null,
      sequence: play.sequenceNumber
        ? parseInt(play.sequenceNumber, 10)
        : null,
      quarter: period,
      clock,
      down,
      distance,
      yards_to_goal: yardsToEndzone,
      yard_line: yardLine,
      play_type: playType,
      yards_gained: statYardage,
      success: null,
      description: play.text ?? null,
      raw: play,
      created_at: new Date().toISOString(),
    });
  }

  return rows;
}

serve(async () => {
  try {
    const schedule = await getFinishedGames();
    const importedGameIds: string[] = [];

    for (const game of schedule) {
      const gameId = game.game_id;
      if (!gameId) continue;

      const already = await gameAlreadyImported(gameId);
      if (already) {
        continue;
      }

      const espnPlays = await fetchEspnPlays(gameId);
      const rows = normalizePlays(gameId, espnPlays);

      if (rows.length === 0) continue;

      const { error } = await supabase.from("plays").upsert(rows, {
        onConflict: "id",
      });

      if (error) {
        throw new Error(
          `Error inserting plays for game ${gameId}: ${error.message}`,
        );
      }

      importedGameIds.push(gameId);
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        imported: importedGameIds.length,
        games: importedGameIds,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("import_finished_games error:", err);
    return new Response(
      JSON.stringify({
        status: "error",
        error: String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
