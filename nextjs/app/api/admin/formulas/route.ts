import { NextResponse } from "next/server";
import type { AdminFormula } from "@/types/admin";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const supabase = adminCheck.client;
  const { data, error } = await supabase.from("admin_formulas").select("*").order("formula_key");

  if (error) {
    return NextResponse.json({ formulas: [] as AdminFormula[], _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ formulas: (data as AdminFormula[]) ?? [] });
}

export async function POST(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const body = (await req.json()) as Partial<AdminFormula>;
  if (!body.formula_key || !body.label || !body.sql_expression || !body.applies_to) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = adminCheck.client;
  const payload = {
    formula_key: body.formula_key,
    label: body.label,
    description: body.description ?? null,
    sql_expression: body.sql_expression,
    applies_to: body.applies_to,
    is_premium: body.is_premium ?? true,
    is_enabled: body.is_enabled ?? true,
  };

  const { data, error } = await supabase
    .from("admin_formulas")
    .upsert(payload, { onConflict: "formula_key" })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminFormula });
}
