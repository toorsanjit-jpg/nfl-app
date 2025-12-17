import { NextRequest, NextResponse } from "next/server";
import type { AdminSavedView } from "@/types/AdminSavedView";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const client = adminCheck.client;

  const { data, error } = await client
    .from("admin_saved_views")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ views: [] as AdminSavedView[], _meta: { error: error.message } });
  }

  return NextResponse.json({ views: (data as AdminSavedView[]) ?? [] });
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const client = adminCheck.client;

  const body = (await req.json()) as Partial<AdminSavedView>;
  if (!body.name || !body.config_id || !body.filters) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const payload = {
    name: body.name,
    config_id: body.config_id,
    filters: body.filters,
    user_id: adminCheck.auth.userId,
  };

  const { data, error } = await client
    .from("admin_saved_views")
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminSavedView });
}
