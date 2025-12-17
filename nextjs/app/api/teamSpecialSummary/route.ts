import { NextResponse } from "next/server";
import type { TeamSpecialSummaryDTO } from "@/types/TeamSpecialSummary";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured", _meta: { missingSupabaseEnv: true } },
      { status: 500 }
    );
  }

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
