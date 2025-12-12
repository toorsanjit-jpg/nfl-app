import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("team_defense_base_view")
    .select("*");

  if (error) {
    console.error("home defense error:", error);
    return NextResponse.json({ rows: [] });
  }

  return NextResponse.json({ rows: data || [] });
}
