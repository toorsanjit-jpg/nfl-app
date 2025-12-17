"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminSavedView } from "@/types/AdminSavedView";
import type { AdminTableConfig } from "@/types/AdminTableConfig";

type Props = {
  initialViews: AdminSavedView[];
  configs: AdminTableConfig[];
  missingEnv?: boolean;
};

const defaultView = {
  id: "",
  name: "",
  config_id: "",
  filtersText: "{}",
};

export function AdminViewsManager({ initialViews, configs, missingEnv }: Props) {
  const [views, setViews] = useState<AdminSavedView[]>(initialViews);
  const [form, setForm] = useState(defaultView);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setViews(initialViews);
  }, [initialViews]);

  const save = async () => {
    setMessage(null);
    let parsed: any = {};
    try {
      parsed = form.filtersText ? JSON.parse(form.filtersText) : {};
    } catch (err) {
      setMessage("Filters JSON is invalid");
      return;
    }

    const res = await fetch("/api/admin/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        config_id: form.config_id,
        filters: parsed,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json?._meta?.error || "Save failed");
      return;
    }
    if (json.saved) {
      setViews([json.saved as AdminSavedView, ...views]);
      setForm(defaultView);
      setMessage("Saved.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this saved view?")) return;
    const res = await fetch(`/api/admin/views/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.deleted) {
      setMessage(json?._meta?.error || "Delete failed");
      return;
    }
    setViews(views.filter((v) => v.id !== id));
  };

  if (missingEnv) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missing Supabase env</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to manage saved views.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">New Saved View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Admin Table</label>
            <Select
              value={form.config_id}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  config_id: e.target.value,
                }))
              }
            >
              <option value="">Select config</option>
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Filters JSON</label>
            <textarea
              className="w-full rounded border px-2 py-1 text-sm"
              rows={4}
              value={form.filtersText}
              onChange={(e) => setForm((prev) => ({ ...prev, filtersText: e.target.value }))}
            />
          </div>
          <Button onClick={save}>Save</Button>
          {message ? <div className="text-xs text-muted-foreground">{message}</div> : null}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Saved Views</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {views.map((v) => {
            const cfg = configs.find((c) => c.id === v.config_id);
            return (
              <div
                key={v.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{v.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cfg?.name ?? v.config_id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => remove(v.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
          {views.length === 0 ? (
            <p className="text-xs text-muted-foreground">No saved views yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
