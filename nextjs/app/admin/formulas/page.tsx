import { AdminFormulasManager } from "@/components/admin/AdminFormulasManager";
import { getBaseUrl } from "@/lib/urlHelpers";
import type { AdminFormula } from "@/types/admin";

export const dynamic = "force-dynamic";

async function fetchFormulas(): Promise<AdminFormula[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/formulas`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.formulas as AdminFormula[]) ?? [];
}

export default async function AdminFormulasPage() {
  const formulas = await fetchFormulas();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin Formulas</h1>
      <p className="text-sm text-muted-foreground">
        Define server-evaluated derived metrics using SQL expressions.
      </p>
      <AdminFormulasManager initial={formulas} />
    </div>
  );
}
