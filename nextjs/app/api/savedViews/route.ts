import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContextFromRequest } from "@/lib/auth";
import type { SavedView } from "@/types/userSaved";

type SavedViewPayload = {
  id?: string;
  name?: string;
  scope?: "league" | "team";
  teamId?: string | null;
  category?: "offense" | "defense" | "special";
  filters?: Record<string, any>;
};

function buildMissingEnvResponse(body: Record<string, any>) {
  return NextResponse.json({
    ...body,
    _meta: { ...(body._meta || {}), missingSupabaseEnv: true },
  });
}

export async function GET(req: Request) {
  const auth = await getUserContextFromRequest(req);
  const searchParams = new URL(req.url).searchParams;

  if (auth.missingSupabaseEnv) {
    return buildMissingEnvResponse({ views: [] as SavedView[] });
  }

  if (!auth.userId) {
    return NextResponse.json(
      { views: [] as SavedView[], _meta: { restricted: true, reason: "login-required" } },
      { status: 401 }
    );
  }

  if (!auth.isPremium && !auth.isAdmin) {
    return NextResponse.json(
      { views: [] as SavedView[], _meta: { restricted: true, reason: "premium-required" } },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return buildMissingEnvResponse({ views: [] as SavedView[] });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const scope = searchParams.get("scope");
  const category = searchParams.get("category");
  const teamId = searchParams.get("teamId");

  let query = supabase.from("saved_views").select("*").eq("user_id", auth.userId);
  if (scope) query = query.eq("scope", scope);
  if (category) query = query.eq("category", category);
  if (teamId) query = query.eq("team_id", teamId);

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    console.error("savedViews GET error:", error);
    return NextResponse.json({
      views: [] as SavedView[],
      _meta: { error: error.message },
    });
  }

  return NextResponse.json({ views: (data as SavedView[]) ?? [] });
}

export async function POST(req: Request) {
  const auth = await getUserContextFromRequest(req);
  if (auth.missingSupabaseEnv) {
    return buildMissingEnvResponse({ saved: null });
  }

  if (!auth.userId) {
    return NextResponse.json(
      { saved: null, _meta: { restricted: true, reason: "login-required" } },
      { status: 401 }
    );
  }

  if (!auth.isPremium && !auth.isAdmin) {
    return NextResponse.json(
      { saved: null, _meta: { restricted: true, reason: "premium-required" } },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return buildMissingEnvResponse({ saved: null });
  }

  const body = (await req.json()) as SavedViewPayload;
  const { id, name, scope, teamId, category, filters } = body;

  if (!name || !scope || !category || !filters) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  if (scope === "team" && !teamId) {
    return NextResponse.json(
      { saved: null, _meta: { error: "teamId is required for team scope" } },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  if (id) {
    const { data: existing, error: fetchError } = await supabase
      .from("saved_views")
      .select("id, user_id, filters")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("savedViews POST fetch error:", fetchError);
      return NextResponse.json({
        saved: null,
        _meta: { error: fetchError.message },
      });
    }

    if (!existing || (existing.user_id !== auth.userId && !auth.isAdmin)) {
      return NextResponse.json(
        { saved: null, _meta: { restricted: true, reason: "not-owner" } },
        { status: 403 }
      );
    }
  }

  const payload = {
    id,
    user_id: auth.userId,
    scope,
    team_id: scope === "team" ? teamId ?? null : null,
    category,
    name,
    filters,
  };

  const { data, error } = await supabase
    .from("saved_views")
    .upsert(payload, { onConflict: "id" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("savedViews POST error:", error);
    return NextResponse.json({
      saved: null,
      _meta: { error: error.message },
    });
  }

  return NextResponse.json({ saved: data as SavedView });
}
