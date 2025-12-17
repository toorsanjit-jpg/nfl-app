import { cookies } from "next/headers";
import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseEnv = {
  url: string | null;
  anonKey: string | null;
};

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
  };
}

export function hasSupabaseEnv() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

export function createServerSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return null;

  // Pass the cookies() function directly so auth-helpers can manage reads/writes.
  return createServerComponentClient<any>({ cookies }) as SupabaseClient;
}

export function createRouteSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return null;
  try {
    return createRouteHandlerClient<any>({
      cookies,
    }) as SupabaseClient;
  } catch {
    return null;
  }
}

export function getSupabaseServerClient(): SupabaseClient | null {
  return createServerSupabase();
}
