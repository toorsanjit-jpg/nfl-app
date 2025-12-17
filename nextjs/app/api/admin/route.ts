import { NextResponse } from "next/server";
import { loadAdminConfig } from "@/lib/adminConfig";
import { getUserContextFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await getUserContextFromRequest(req);
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

  const config = await loadAdminConfig();
  return NextResponse.json(config);
}
