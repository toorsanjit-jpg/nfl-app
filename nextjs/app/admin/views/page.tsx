import { AdminViewsManager } from "@/components/admin/AdminViewsManager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getUserContextFromCookies } from "@/lib/auth";
import { getBaseUrl } from "@/lib/urlHelpers";
import type { AdminSavedView } from "@/types/AdminSavedView";
import type { AdminTableConfig } from "@/types/AdminTableConfig";

export const dynamic = "force-dynamic";

async function fetchViews() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/views`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { views: [] as AdminSavedView[], missingEnv: json?._meta?.missingSupabaseEnv };
  }
  return { views: (json.views as AdminSavedView[]) ?? [], missingEnv: json?._meta?.missingSupabaseEnv };
}

async function fetchConfigs() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/configs`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { configs: [] as AdminTableConfig[], missingEnv: json?._meta?.missingSupabaseEnv };
  }
  return {
    configs: (json.configs as AdminTableConfig[]) ?? [],
    missingEnv: json?._meta?.missingSupabaseEnv,
  };
}

export default async function AdminViewsPage() {
  const ctx = await getUserContextFromCookies();
  if (!ctx.userId || !ctx.isAdmin || !ctx.isPremium) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Not authorized</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Admin access required to manage saved views.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ views, missingEnv: missingEnvViews }, { configs, missingEnv: missingEnvCfg }] =
    await Promise.all([fetchViews(), fetchConfigs()]);

  const missingEnv = missingEnvViews || missingEnvCfg;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Admin Saved Views</h1>
        <p className="text-sm text-muted-foreground">
          Create views tied to admin table configs with stored filter states.
        </p>
      </div>
      <AdminViewsManager initialViews={views} configs={configs} missingEnv={missingEnv} />
    </div>
  );
}
