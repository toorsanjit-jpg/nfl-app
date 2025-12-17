import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function createServerSupabase(): SupabaseClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const store = cookies() as any;
          return store.get?.(name)?.value;
        },
        set(name: string, value: string, options: any) {
          const store = cookies() as any;
          store.set?.({ name, value, ...options });
        },
        remove(name: string, options: any) {
          const store = cookies() as any;
          store.set?.({ name, value: "", ...options });
        },
      },
    }
  );
}

// Legacy helpers that now delegate to the SSR client
export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
  };
}

export function hasSupabaseEnv() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!hasSupabaseEnv()) return null;
  return createServerSupabase();
}

export function createRouteSupabase(): SupabaseClient | null {
  if (!hasSupabaseEnv()) return null;
  return createServerSupabase();
}
