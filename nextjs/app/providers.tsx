"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

type Props = {
  children: React.ReactNode;
  initialSession: Session | null;
};

type SupabaseContextValue = {
  supabase: SupabaseClient | null;
  session: Session | null;
};

export const SupabaseContext = React.createContext<SupabaseContextValue>({
  supabase: null,
  session: null,
});

export default function Providers({ children, initialSession }: Props) {
  const [session, setSession] = useState<Session | null>(initialSession);

  const supabase = useMemo<SupabaseClient | null>(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    try {
      return createClientComponentClient<any>({
        supabaseUrl: url,
        supabaseKey: anon,
        isSingleton: true,
      }) as SupabaseClient;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!supabase) {
    return <>{children}</>;
  }

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
}
