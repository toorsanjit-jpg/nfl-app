"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabaseClient";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  const sendMagicLink = async () => {
    if (!supabase) {
      setMessage("Missing Supabase client.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage(null);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your email for the magic link.");
  };

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <Button onClick={sendMagicLink} disabled={!email || status === "loading"}>
        {status === "loading" ? "Sending..." : "Send magic link"}
      </Button>
      {status === "sent" && <p className="text-xs text-green-600">{message}</p>}
      {status === "error" && <p className="text-xs text-red-600">{message}</p>}
      {status === "idle" && message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
