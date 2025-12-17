import { AdminFiltersManager } from "@/components/admin/AdminFiltersManager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getUserContextFromCookies } from "@/lib/auth";
import { getBaseUrl } from "@/lib/urlHelpers";
import type { AdminFilter } from "@/types/admin";

export const dynamic = "force-dynamic";

async function fetchFilters(): Promise<AdminFilter[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/filters`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.filters as AdminFilter[]) ?? [];
}

export default async function AdminFiltersPage() {
  const ctx = await getUserContextFromCookies();
  if (!ctx.userId || !ctx.isAdmin || !ctx.isPremium) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin access denied</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You must be a premium admin to manage filters.
          </CardContent>
        </Card>
      </div>
    );
  }

  const filters = await fetchFilters();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin · Filters</h1>
      <p className="text-sm text-muted-foreground">
        Control which filters appear in the advanced UI and their gating.
      </p>
      <AdminFiltersManager initial={filters} />
    </div>
  );
}
