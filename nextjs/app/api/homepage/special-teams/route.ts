// app/api/homepage/special-teams/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("homepage_team_special_teams")
    .select("*");

  if (error) {
    console.error("homepage_team_special_teams error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
