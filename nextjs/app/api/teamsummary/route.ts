import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-only client (this code only runs on the server)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const teamId = searchParams.get("teamId");
  const seasonParam = searchParams.get("season");

  if (!teamId) {
    return NextResponse.json(
      { error: "Missing teamId" },
      { status: 400 }
    );
  }

  const season = seasonParam ? Number(seasonParam) : null;

  const { data, error } = await supabase.rpc("fn_team_summary", {
    p_team_id: teamId,
    p_season: season,
  });

  if (error) {
    console.error("fn_team_summary error:", error);
    return NextResponse.json(
      { error: "Failed to load team summary" },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({ summary: row ?? null });
}
