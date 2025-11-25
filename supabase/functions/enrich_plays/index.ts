// supabase/functions/enrich_plays/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.224.0/csv/mod.ts";

type StoragePayload = {
  type: string;
  table: string;
  record: {
    bucket_id: string;
    name: string;
    [key: string]: unknown;
  };
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function toInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === "") return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function toBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim().toLowerCase();
  if (["1", "true", "t", "yes", "y"].includes(str)) return true;
  if (["0", "false", "f", "no", "n"].includes(str)) return false;
  return null;
}

function emptyToNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as StoragePayload;

    const bucket = payload.record.bucket_id;
    const path = payload.record.name;

    if (bucket !== "nfl-enriched") {
      return new Response(
        JSON.stringify({ message: "Ignoring other buckets", bucket }),
        { status: 200 }
      );
    }

    console.log("Processing CSV:", bucket, path);

    // Download the CSV file from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError || !fileData) {
      console.error("Error downloading file:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download CSV", details: downloadError }),
        { status: 500 }
      );
    }

    const csvText = await fileData.text();

    // Parse CSV: first row = header, columns = true => objects keyed by header names
    const rows = (await parse(csvText, {
      skipFirstRow: true,
      columns: true,
    })) as Array<Record<string, string>>;

    console.log(`Parsed ${rows.length} rows from CSV`);

    let updatedById = 0;
    let updatedByFallback = 0;
    let unmatched = 0;

    for (const row of rows) {
      const gameId = toInt(row["GameId"]);
      const playId = toInt(row["PlayId"]);

      if (!gameId) {
        unmatched++;
        continue;
      }

      // Build the update payload using your mappings
      const updatePayload: Record<string, unknown> = {
        team: emptyToNull(row["team"]),
        opponent: emptyToNull(row["opponent"]),
        game_date: emptyToNull(row["Game Date"]),
        week: toInt(row["week"]),
        qtr: toInt(row["qtr"]),
        los: emptyToNull(row["los"]),
        yds: toInt(row["yds"]),

        pass_rushers_7_plus: toInt(row["7+ pass rushers"]),
        pass_rushers_6: toInt(row["6 pass rushers"]),
        pass_rushers_5: toInt(row["5 pass rushers"]),
        pass_rushers_4: toInt(row["4 pass rushers"]),

        coverage_single_high: toBool(row["Coverage Shell Single-High"]),
        coverage_two_high: toBool(row["Coverage Shell 2-high"]),
        coverage_zero: toBool(row["Coverage Shell C0"]),
        cover_2man_or_pre: toBool(row["Cover 2M or Pre"]),

        cover0_snap: toBool(row["Cover 0 Snap"]),
        cover6_snap: toBool(row["Cover 6 Snap"]),
        cover4_snap: toBool(row["Cover 4 Snap"]),
        cover3_snap: toBool(row["Cover 3 Snap"]),
        cover2_snap: toBool(row["Cover 2 Snap"]),
        cover1_snap: toBool(row["Cover 1 Snap"]),

        yds_post_contact: toInt(row["YdsPostCt"]),
        temp: emptyToNull(row["Temp"]),
        sack: toBool(row["Sack"]),
        routes_run: toInt(row["RoutesRun"]),
        qb_hit: toBool(row["QBHit"]),
        hurried: toBool(row["Hurried"]),
        pass_rush_count: toInt(row["PsRshCnt"]),
        player_sack: emptyToNull(row["PlayerSack"]),
        play_result: emptyToNull(row["PlayResult"]),
        play_type: emptyToNull(row["PlayType"]),
        play_desc: emptyToNull(row["PlayDesc"]),
        huddle: toBool(row["Huddle"]),
        date: emptyToNull(row["Date"]),
        season: toInt(row["Season"]),
        yds_pre_contact: toInt(row["YdsPreCt"]),
        ngs_off_formation: emptyToNull(row["NGSOffFormation"]),
        play_action: toBool(row["PlayAct"]),
        yac: toInt(row["YAC"]),
        air_yards: toInt(row["AirYds"]),
        blockers: toInt(row["Blockers"]),
        target_id: emptyToNull(row["TargetID"]),
        rusher_id: emptyToNull(row["RusherID"]),
        passer_id: emptyToNull(row["PasserID"]),
        enriched_description: emptyToNull(row["description"]),
        shotgun: toBool(row["Shotgun"]),
        rbs: toInt(row["RBs"]),
        tes: toInt(row["TEs"]),
        wrs: toInt(row["WRs"]),
        dbs: toInt(row["DBs"]),
        play_clock: emptyToNull(row["PlayClock"]),
      };

      // First try: match by game_id + play_id
      let { data: updatedRows, error: updateError } = await supabase
        .from("nfl_plays")
        .update(updatePayload)
        .eq("game_id", gameId)
        .eq("play_id", playId)
        .select("id");

      if (updateError) {
        console.error("Error updating by game_id + play_id:", updateError);
      }

      if (updatedRows && updatedRows.length > 0) {
        updatedById += updatedRows.length;
        continue;
      }

      // Fallback: game_id + qtr + PlayClock + team
      const qtr = toInt(row["qtr"]);
      const playClock = emptyToNull(row["PlayClock"]);
      const team = emptyToNull(row["team"]);

      if (!qtr || !playClock || !team) {
        unmatched++;
        continue;
      }

      const { data: fallbackRows, error: fallbackError } = await supabase
        .from("nfl_plays")
        .update(updatePayload)
        .eq("game_id", gameId)
        .eq("qtr", qtr)
        .eq("play_clock", playClock)
        .eq("team", team)
        .select("id");

      if (fallbackError) {
        console.error("Error in fallback update:", fallbackError);
      }

      if (fallbackRows && fallbackRows.length > 0) {
        updatedByFallback += fallbackRows.length;
      } else {
        unmatched++;
      }
    }

    const summary = {
      rows: rows.length,
      updatedById,
      updatedByFallback,
      unmatched,
      file: path,
    };

    console.log("Enrich summary:", summary);

    return new Response(JSON.stringify(summary), { status: 200 });
  } catch (err) {
    console.error("Unexpected error in enrich_plays:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: `${err}` }),
      { status: 500 },
    );
  }
});
