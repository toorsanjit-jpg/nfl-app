import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured", _meta: { missingSupabaseEnv: true } },
      { status: 500 }
    );
  }

  const body = await req.json();

  const { teamId, filters, columns } = body;

  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_team_advanced", {
    p_team_id: teamId,
    p_filters: filters ?? [],
    p_columns: columns ?? [],
  });

  if (error) {
    console.error("Advanced RPC error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ result: data });
}
