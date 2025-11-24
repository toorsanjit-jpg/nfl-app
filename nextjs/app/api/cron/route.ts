import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const projectRef =
    process.env.SUPABASE_PROJECT_REF ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https?:\/\/([^.]+)\./)?.[1];
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!projectRef || !anonKey) {
    console.error("Missing Supabase project ref or anon key for cron call");
    return NextResponse.json(
      { ok: false, error: "Supabase project ref/anon key not configured" },
      { status: 500 }
    );
  }

  const functionBase = `https://${projectRef}.supabase.co/functions/v1`;
  const url = `${functionBase}/sync_schedule`;

  console.log("Vercel Cron: calling sync_schedule");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("sync_schedule failed:", res.status, text);
    return NextResponse.json(
      { ok: false, error: `sync_schedule failed: ${res.status}` },
      { status: 500 }
    );
  }

  const data = await res.json().catch(() => null);

  return NextResponse.json({
    ok: true,
    source: "vercel-cron",
    sync_result: data,
  });
}
