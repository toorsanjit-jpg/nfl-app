import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabaseServer";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-red-600">
            Missing Supabase environment variables. Admin access is disabled.
          </p>
          <Button variant="outline" asChild className="mt-3">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    redirect(adminCheck.redirectTo ?? "/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-muted/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-lg font-bold">
              Admin Panel
            </Link>
          </div>
          <AdminLogoutButton />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
        <aside className="w-56 shrink-0 space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="px-2 text-xs font-semibold uppercase text-muted-foreground">Navigation</p>
          <nav className="grid gap-1">
            {[
              { href: "/admin/schema", label: "Schema" },
              { href: "/admin/tables", label: "Tables" },
              { href: "/admin/fields", label: "Fields" },
              { href: "/admin/filters", label: "Filters" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-foreground transition hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 rounded-lg border bg-background p-4 shadow-sm">{children}</main>
      </div>
    </div>
  );
}

function AdminLogoutButton() {
  "use client";
  const supabase = getBrowserSupabase();
  const [loading, setLoading] = React.useState(false);
  const router = require("next/navigation").useRouter();

  const onLogout = async () => {
    setLoading(true);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
      router.push("/");
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={onLogout} disabled={loading}>
      {loading ? "Signing out..." : "Logout"}
    </Button>
  );
}
