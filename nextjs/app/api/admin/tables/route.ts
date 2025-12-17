import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContextFromRequest } from "@/lib/auth";
import type { AdminTable } from "@/types/admin";

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
  if (!supabaseUrl || !serviceKey) return missingEnv({ tables: [] as AdminTable[] });

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("admin_tables")
    .select("*")
    .order("table_key");

  if (error) {
    return NextResponse.json({ tables: [] as AdminTable[], _meta: { error: error.message } });
  }

  return NextResponse.json({ tables: (data as AdminTable[]) ?? [] });
}

export async function POST(req: Request) {
  const auth = await getUserContextFromRequest(req);
  const gate = requireAdmin(auth);
  if (gate) return gate;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return missingEnv({ saved: null });

  const body = (await req.json()) as Partial<AdminTable>;
  if (!body.table_key || !body.title) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const payload = {
    table_key: body.table_key,
    title: body.title,
    description: body.description ?? null,
    is_enabled: body.is_enabled ?? true,
    default_sort_field: body.default_sort_field ?? null,
    default_sort_dir: body.default_sort_dir ?? null,
  };

  const { data, error } = await supabase
    .from("admin_tables")
    .upsert(payload, { onConflict: "table_key" })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminTable });
}
