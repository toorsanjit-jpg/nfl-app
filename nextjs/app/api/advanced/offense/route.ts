import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { TeamOffenseRow, AdvancedGroupBy } from "@/types/TeamAdvanced";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const teamId = searchParams.get("teamId"); // optional
  const seasonParam = searchParams.get("season"); // optional
  const groupByRaw = searchParams.get("groupBy");

  const groupBy: AdvancedGroupBy =
    (groupByRaw as AdvancedGroupBy) || "team";

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If env vars are missing (e.g., during build without secrets), return a safe stub.
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      groupBy,
      season: seasonParam ? Number(seasonParam) : null,
      rows: [] as TeamOffenseRow[],
      _meta: { missingSupabaseEnv: true },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let query = supabase
      .from("team_offense_base_view")
      .select("*");

    if (teamId) {
      query = query.eq("team_id", teamId);
    }

    if (seasonParam) {
      const seasonNumber = Number(seasonParam);
      if (!Number.isNaN(seasonNumber)) {
        query = query.eq("season", seasonNumber);
      }
    }

    // NOTE:
    // For now, groupBy is "team" only and the view is already aggregated.
    // Later we can add additional grouping modes or joins.
    const { data, error } = await query;

    if (error) {
      console.error("advanced/offense db error:", error);
      return NextResponse.json(
        { error: "db_error", details: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as TeamOffenseRow[];

    return NextResponse.json({
      groupBy,
      season: seasonParam ? Number(seasonParam) : null,
      rows,
    });
  } catch (err) {
    console.error("advanced/offense GET error:", err);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
