import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContextFromRequest } from "@/lib/auth";
import type { AdminTableField } from "@/types/admin";

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
  if (!supabaseUrl || !serviceKey) return missingEnv({ tableFields: [] as AdminTableField[] });

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("admin_table_fields")
    .select("*")
    .order("table_key")
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ tableFields: [] as AdminTableField[], _meta: { error: error.message } });
  }

  return NextResponse.json({ tableFields: (data as AdminTableField[]) ?? [] });
}

export async function POST(req: Request) {
  const auth = await getUserContextFromRequest(req);
  const gate = requireAdmin(auth);
  if (gate) return gate;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return missingEnv({ saved: null });

  const body = (await req.json()) as Partial<AdminTableField>;
  if (!body.table_key || !body.field_name) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const payload = {
    table_key: body.table_key,
    field_name: body.field_name,
    order_index: body.order_index ?? 0,
    is_visible: body.is_visible ?? true,
  };

  const { data, error } = await supabase
    .from("admin_table_fields")
    .upsert(payload, { onConflict: "table_key,field_name" })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminTableField });
}
