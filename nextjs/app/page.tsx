import HomeDashboard from "@/components/home/HomeDashboard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">NFL Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Content is driven by admin tables (page=&quot;homepage&quot;). Visibility respects access levels.
        </p>
      </header>
      <HomeDashboard />
    </div>
  );
}
