// nextjs/app/api/advanced/plays/route.ts
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase env vars missing");
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);

  const teamId = searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json(
      { error: "Missing teamId" },
      { status: 400 }
    );
  }

  const season      = searchParams.get("season");
  const down        = searchParams.get("down");
  const quarter     = searchParams.get("quarter");
  const playResult  = searchParams.get("playResult");
  const minYardline = searchParams.get("minYardline");
  const maxYardline = searchParams.get("maxYardline");

  const body = {
    p_team_id:       teamId,
    p_season:        season      ? Number(season)      : null,
    p_down:          down        ? Number(down)        : null,
    p_quarter:       quarter     ? Number(quarter)     : null,
    p_play_result:   playResult  || null,
    p_min_yardline:  minYardline ? Number(minYardline) : null,
    p_max_yardline:  maxYardline ? Number(maxYardline) : null,
  };

  const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/fn_offense_filtered_plays`;

  const resp = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("fn_offense_filtered_plays error:", resp.status, text);
    return NextResponse.json(
      { error: "Failed to fetch plays" },
      { status: 500 }
    );
  }

  const data = await resp.json();
  return NextResponse.json({ plays: data });
}
