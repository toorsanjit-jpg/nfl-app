import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabase, hasSupabaseEnv } from "@/lib/supabaseServer";
import { isAdminUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabase = createRouteSupabase();
  if (!supabase || !code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  await supabase.auth.exchangeCodeForSession(code);
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const destination = user && isAdminUser(user) ? "/admin" : next;

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
