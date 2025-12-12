import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { TeamDefenseRow, AdvancedGroupBy } from "@/types/TeamAdvanced";

// service role client – server-only
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const teamId = searchParams.get("teamId"); // optional
  const seasonParam = searchParams.get("season"); // optional
  const groupByRaw = searchParams.get("groupBy");

  const groupBy: AdvancedGroupBy =
    (groupByRaw as AdvancedGroupBy) || "team";

  try {
    let query = supabase
      .from("team_defense_base_view")
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

    const { data, error } = await query;

    if (error) {
      console.error("advanced/defense db error:", error);
      return NextResponse.json(
        { error: "db_error", details: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as TeamDefenseRow[];

    return NextResponse.json({
      groupBy,
      season: seasonParam ? Number(seasonParam) : null,
      rows,
    });
  } catch (err) {
    console.error("advanced/defense GET error:", err);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
