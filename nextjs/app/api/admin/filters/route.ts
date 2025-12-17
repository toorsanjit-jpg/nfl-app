import { NextResponse } from "next/server";
import type { AdminFilter } from "@/types/admin";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const supabase = adminCheck.client;
  const { data, error } = await supabase.from("admin_filters").select("*").order("filter_key");

  if (error) {
    return NextResponse.json({ filters: [] as AdminFilter[], _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ filters: (data as AdminFilter[]) ?? [] });
}

export async function POST(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const body = (await req.json()) as Partial<AdminFilter>;
  if (!body.filter_key || !body.field_name || !body.operator || !body.ui_type) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = adminCheck.client;
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
