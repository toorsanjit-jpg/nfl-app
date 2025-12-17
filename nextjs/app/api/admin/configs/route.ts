import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContextFromRequest } from "@/lib/auth";
import type { AdminTableConfig } from "@/types/AdminTableConfig";

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

function getClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

export async function GET(req: NextRequest) {
  const auth = await getUserContextFromRequest(req);
  const gate = requireAdmin(auth);
  if (gate) return gate;

  const client = getClient();
  if (!client) return missingEnv({ configs: [] as AdminTableConfig[] });

  const { data, error } = await client
    .from("admin_table_configs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ configs: [] as AdminTableConfig[], _meta: { error: error.message } });
  }

  return NextResponse.json({ configs: (data as AdminTableConfig[]) ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await getUserContextFromRequest(req);
  const gate = requireAdmin(auth);
  if (gate) return gate;

  const client = getClient();
  if (!client) return missingEnv({ saved: null });

  const body = (await req.json()) as Partial<AdminTableConfig>;
  if (!body.name || !body.slug || !body.source_table) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const payload = {
    name: body.name,
    slug: body.slug,
    source_table: body.source_table,
    columns: body.columns ?? [],
    available_filters: body.available_filters ?? {},
    default_filters: body.default_filters ?? {},
    formulas: body.formulas ?? [],
  };

  const { data, error } = await client
    .from("admin_table_configs")
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminTableConfig });
}
