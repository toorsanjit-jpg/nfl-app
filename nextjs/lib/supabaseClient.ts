import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseEnv = {
  url: string | null;
  anonKey: string | null;
};

function readSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
  };
}

export function getBrowserSupabase(): SupabaseClient | null {
  const { url, anonKey } = readSupabaseEnv();
  if (!url || !anonKey) return null;
  try {
    return createClientComponentClient<any>({
      supabaseUrl: url,
      supabaseKey: anonKey,
      isSingleton: true,
    }) as SupabaseClient;
  } catch {
    return null;
  }
}
