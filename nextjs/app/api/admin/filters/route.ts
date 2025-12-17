import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContextFromRequest } from "@/lib/auth";
import type { AdminFilter } from "@/types/admin";

function missingEnv(body: Record<string, any>) {
  return NextResponse.json({ ...body, _meta: { missingSupabaseEnv: true } });
}

function requireAdmin(auth: any) {
  if (!auth.userId) {
    return NextResponse.json(
      { _meta: { restricted: true, reason: "login-required" } },
      { status: 401 }
    );
  }
  if (!auth.isAdmin || !auth.isPremium) {
    return NextResponse.json(
      { _meta: { restricted: true, reason: "admin-required" } },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: Request) {
  const auth = await getUserContextFromRequest(req);
  const gate = requireAdmin(auth);
  if (gate) return gate;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return missingEnv({ filters: [] as AdminFilter[] });

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.from("admin_filters").select("*").order("filter_key");

  if (error) {
    return NextResponse.json({ filters: [] as AdminFilter[], _meta: { error: error.message } });
  }

  return NextResponse.json({ filters: (data as AdminFilter[]) ?? [] });
}

export async function POST(req: Request) {
  const auth = await getUserContextFromRequest(req);
  const gate = requireAdmin(auth);
  if (gate) return gate;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return missingEnv({ saved: null });

  const body = (await req.json()) as Partial<AdminFilter>;
  if (!body.filter_key || !body.field_name || !body.operator || !body.ui_type) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const payload = {
    filter_key: body.filter_key,
    field_name: body.field_name,
    operator: body.operator,
    is_public: body.is_public ?? false,
    is_premium: body.is_premium ?? false,
    ui_type: body.ui_type,
  };

  const { data, error } = await supabase
    .from("admin_filters")
    .upsert(payload, { onConflict: "filter_key" })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminFilter });
}
