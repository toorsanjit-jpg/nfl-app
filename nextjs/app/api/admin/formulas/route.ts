import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContextFromRequest } from "@/lib/auth";
import type { AdminFormula } from "@/types/admin";

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
  if (!supabaseUrl || !serviceKey) return missingEnv({ formulas: [] as AdminFormula[] });

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.from("admin_formulas").select("*").order("formula_key");

  if (error) {
    return NextResponse.json({ formulas: [] as AdminFormula[], _meta: { error: error.message } });
  }

  return NextResponse.json({ formulas: (data as AdminFormula[]) ?? [] });
}

export async function POST(req: Request) {
  const auth = await getUserContextFromRequest(req);
  const gate = requireAdmin(auth);
  if (gate) return gate;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return missingEnv({ saved: null });

  const body = (await req.json()) as Partial<AdminFormula>;
  if (!body.formula_key || !body.label || !body.sql_expression || !body.applies_to) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
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
