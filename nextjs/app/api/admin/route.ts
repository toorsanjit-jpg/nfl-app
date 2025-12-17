import { NextResponse } from "next/server";
import { loadAdminConfig } from "@/lib/adminConfig";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const config = await loadAdminConfig();
  return NextResponse.json(config);
}
