import { NextResponse } from "next/server";
import type { AdminField } from "@/types/admin";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const supabase = adminCheck.client;
  const { data, error } = await supabase
    .from("admin_fields")
    .select("*")
    .order("category")
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ fields: [] as AdminField[], _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ fields: (data as AdminField[]) ?? [] });
}

export async function POST(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const body = (await req.json()) as Partial<AdminField>;
  if (!body.field_name || !body.label || !body.category || !body.data_type) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = adminCheck.client;
  const payload = {
    field_name: body.field_name,
    label: body.label,
    category: body.category,
    is_public: !!body.is_public,
    is_logged_in: !!body.is_logged_in,
    is_premium: !!body.is_premium,
    is_filterable: !!body.is_filterable,
    data_type: body.data_type,
    order_index: body.order_index ?? 0,
  };

  const { data, error } = await supabase
    .from("admin_fields")
    .upsert(payload, { onConflict: "field_name" })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminField });
}
