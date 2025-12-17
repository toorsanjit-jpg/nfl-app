import { AdminFiltersManager } from "@/components/admin/AdminFiltersManager";
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
  const filters = await fetchFilters();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin Filters</h1>
      <p className="text-sm text-muted-foreground">
        Control which filters appear in the advanced UI and their gating.
      </p>
      <AdminFiltersManager initial={filters} />
    </div>
  );
}
