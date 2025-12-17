import { NextResponse } from "next/server";
import type { AdminTableField } from "@/types/admin";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const supabase = adminCheck.client;
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
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const body = (await req.json()) as Partial<AdminTableField>;
  if (!body.table_key || !body.field_name) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = adminCheck.client;
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
