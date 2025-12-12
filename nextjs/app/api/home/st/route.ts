import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase.rpc("fn_team_special_summary_all");

  if (error) {
    console.error("home special teams error:", error);
    return NextResponse.json({ rows: [] });
  }

  return NextResponse.json({ rows: data || [] });
}
