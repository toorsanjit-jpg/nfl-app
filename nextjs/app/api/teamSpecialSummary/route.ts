import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { TeamSpecialSummaryDTO } from "@/types/TeamSpecialSummary";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_team_special_summary", {
    p_team_id: teamId,
  });

  if (error) {
    console.error("RPC error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = (data?.[0] as TeamSpecialSummaryDTO | undefined) ?? null;

  return NextResponse.json({ summary });
}
