import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin dashboard (coming next)</h1>
        <p className="text-sm text-muted-foreground">
          Use the navigation to jump into admin tooling once it is built out.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/admin/schema", label: "Schema", desc: "Define base structures" },
          { href: "/admin/tables", label: "Tables", desc: "Organize tables and defaults" },
          { href: "/admin/fields", label: "Fields", desc: "Set up labels and visibility" },
          { href: "/admin/filters", label: "Filters", desc: "Placeholder for filter builder" },
        ].map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle className="text-base">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex items-center justify-between">
              <p>{item.desc}</p>
              <Link href={item.href} className="text-primary underline underline-offset-4">
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
