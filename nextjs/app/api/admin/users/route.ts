import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import type { AdminUser } from "@/types/admin";

export async function GET(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const supabase = adminCheck.client;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,is_admin,is_premium,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ users: [] as AdminUser[], _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ users: (data as AdminUser[]) ?? [] });
}

export async function POST(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const supabase = adminCheck.client;
  const body = (await req.json()) as Partial<AdminUser> & { id?: string };

  if (!body.id) {
    return NextResponse.json({ saved: null, _meta: { error: "Missing user id" } }, { status: 400 });
  }

  const updates: Partial<AdminUser> = {
    is_admin: body.is_admin ?? false,
    is_premium: body.is_premium ?? false,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", body.id)
    .select("id,email,is_admin,is_premium,created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  // Log change
  await supabase.from("admin_users").insert({
    user_id: body.id,
    changed_by: adminCheck.auth.userId,
    is_admin: updates.is_admin,
    is_premium: updates.is_premium,
  });

  return NextResponse.json({ saved: data as AdminUser });
}
