import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserContextFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const ctx = await getUserContextFromCookies();

  if (!ctx.userId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin access requires login</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sign in with an admin account to continue.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ctx.isAdmin || !ctx.isPremium) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin access denied</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>You must be a premium admin to view the admin panel.</p>
            <Button asChild variant="outline">
              <Link href="/">Return home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <p className="text-sm text-muted-foreground">
        Manage field visibility, tables, filters, and formulas without redeploying.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          { href: "/admin/schema", label: "Schema Builder", desc: "Configure admin-defined tables" },
          { href: "/admin/views", label: "Saved Views", desc: "Admin saved views" },
          { href: "/admin/import", label: "Import Game", desc: "Manual import (placeholder)" },
          { href: "/admin/premium-users", label: "Premium Users", desc: "Manage premium users (placeholder)" },
          { href: "/admin/fields", label: "Fields", desc: "Visibility, labels, filterability" },
          { href: "/admin/tables", label: "Tables", desc: "Table groupings and defaults" },
          { href: "/admin/table-fields", label: "Table Fields", desc: "Assign fields to tables" },
          { href: "/admin/formulas", label: "Formulas", desc: "Custom derived metrics (SQL)" },
          { href: "/admin/filters", label: "Filters", desc: "UI filters and gating" },
        ].map((item) => (
          <Card key={item.href} className="hover:border-primary/50">
            <CardHeader>
              <CardTitle className="text-base">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{item.desc}</p>
              <Button size="sm" asChild>
                <Link href={item.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
