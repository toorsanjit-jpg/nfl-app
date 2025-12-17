"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import type { AdminTableConfig } from "@/types/AdminTableConfig";
import type { IntrospectedColumn } from "@/lib/supabaseIntrospect";

type Props = {
  initialConfigs: AdminTableConfig[];
  columns: IntrospectedColumn[];
  missingEnv?: boolean;
};

const defaultConfig: AdminTableConfig = {
  id: "",
  name: "",
  slug: "",
  source_table: "nfl_plays",
  columns: [],
  available_filters: {},
  default_filters: {},
  formulas: [],
};

type FormulaDraft = { label: string; key: string; expression: string };

export function AdminSchemaBuilder({ initialConfigs, columns, missingEnv }: Props) {
  const [configs, setConfigs] = useState<AdminTableConfig[]>(initialConfigs);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConfigs[0]?.id ?? null
  );
  const [form, setForm] = useState<AdminTableConfig>(defaultConfig);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formulaDraft, setFormulaDraft] = useState<FormulaDraft>({
    label: "",
    key: "",
    expression: "",
  });

  useEffect(() => {
    if (selectedId) {
      const cfg = configs.find((c) => c.id === selectedId);
      if (cfg) setForm(cfg);
    } else {
      setForm(defaultConfig);
    }
  }, [selectedId, configs]);

  const availableColumns = useMemo(() => columns ?? [], [columns]);

  const toggleColumn = (col: string) => {
    setForm((prev) => {
      const exists = prev.columns.includes(col);
      return {
        ...prev,
        columns: exists
          ? prev.columns.filter((c) => c !== col)
          : [...prev.columns, col],
      };
    });
  };

  const toggleFilter = (key: keyof AdminTableConfig["available_filters"]) => {
    setForm((prev) => ({
      ...prev,
      available_filters: {
        ...prev.available_filters,
        [key]: !prev.available_filters?.[key],
      },
    }));
  };

  const updateDefaultFilter = (key: "season" | "week", value: string) => {
    const parsed =
      value === "" ? null : value === "latest" ? "latest" : Number(value);
    setForm((prev) => ({
      ...prev,
      default_filters: {
        ...prev.default_filters,
        [key]: parsed,
      },
    }));
  };

  const addFormula = () => {
    if (!formulaDraft.key || !formulaDraft.label || !formulaDraft.expression) return;
    setForm((prev) => ({
      ...prev,
      formulas: [
        ...(prev.formulas ?? []),
        {
          label: formulaDraft.label,
          key: formulaDraft.key,
          expression: formulaDraft.expression,
        },
      ],
    }));
    setFormulaDraft({ label: "", key: "", expression: "" });
  };

  const removeFormula = (key: string) => {
    setForm((prev) => ({
      ...prev,
      formulas: (prev.formulas ?? []).filter((f) => f.key !== key),
    }));
  };

  const saveConfig = async () => {
    setMessage(null);
    setSaving(true);
    const method = form.id ? "PATCH" : "POST";
    const target = form.id ? `/api/admin/configs/${form.id}` : "/api/admin/configs";
    const res = await fetch(target, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json?._meta?.error || "Failed to save config");
      setSaving(false);
      return;
    }
    if (json.saved) {
      const saved = json.saved as AdminTableConfig;
      setConfigs((prev) => {
        const without = prev.filter((c) => c.id !== saved.id);
        return [saved, ...without];
      });
      setSelectedId(saved.id);
      setMessage("Saved.");
    }
    setSaving(false);
  };

  const deleteConfig = async (id: string) => {
    if (!confirm("Delete this config?")) return;
    const res = await fetch(`/api/admin/configs/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.deleted) {
      setMessage(json?._meta?.error || "Delete failed");
      return;
    }
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    setSelectedId(null);
    setForm(defaultConfig);
  };

  if (missingEnv) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missing Supabase env</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use the schema builder.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Admin Tables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedId(null);
              setForm(defaultConfig);
            }}
          >
            + New Config
          </Button>
          <div className="space-y-2">
            {configs.map((cfg) => (
              <div
                key={cfg.id}
                className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
                  selectedId === cfg.id ? "border-primary" : "border-muted"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{cfg.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cfg.slug}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{cfg.source_table}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedId(cfg.id)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteConfig(cfg.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {configs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No configs yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            {form.id ? "Edit Config" : "New Config"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Slug</label>
              <Input
                value={form.slug ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Source table
              </label>
              <Select
                value={form.source_table}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, source_table: e.target.value }))
                }
              >
                <option value="nfl_plays">nfl_plays</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Columns to show</span>
              <Badge variant="outline">{form.columns.length} selected</Badge>
            </div>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-auto rounded border p-3 text-sm">
              {availableColumns.map((col) => (
                <label key={col.column_name} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.columns.includes(col.column_name)}
                    onChange={() => toggleColumn(col.column_name)}
                  />
                  <span className="font-mono text-xs">{col.column_name}</span>
                  <span className="text-[10px] text-muted-foreground">{col.data_type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded border p-3">
              <div className="text-sm font-semibold">Available Filters</div>
              {[
                "season",
                "week",
                "playType",
                "shotgun",
                "noHuddle",
                "offenseTeam",
                "defenseTeam",
              ].map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean((form.available_filters as any)?.[key])}
                    onChange={() =>
                      toggleFilter(key as keyof AdminTableConfig["available_filters"])
                    }
                  />
                  {key}
                </label>
              ))}
            </div>

            <div className="space-y-2 rounded border p-3">
              <div className="text-sm font-semibold">Default Filters</div>
              <label className="flex items-center gap-2 text-sm">
                Season
                <Input
                  placeholder="latest or number"
                  value={
                    form.default_filters?.season === null ||
                    form.default_filters?.season === undefined
                      ? ""
                      : String(form.default_filters?.season)
                  }
                  onChange={(e) => updateDefaultFilter("season", e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                Week
                <Input
                  placeholder="latest or number"
                  value={
                    form.default_filters?.week === null ||
                    form.default_filters?.week === undefined
                      ? ""
                      : String(form.default_filters?.week)
                  }
                  onChange={(e) => updateDefaultFilter("week", e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Computed Fields (formulas)</span>
              <Badge variant="outline">{form.formulas?.length ?? 0}</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Label"
                value={formulaDraft.label}
                onChange={(e) => setFormulaDraft((prev) => ({ ...prev, label: e.target.value }))}
              />
              <Input
                placeholder="Key"
                value={formulaDraft.key}
                onChange={(e) => setFormulaDraft((prev) => ({ ...prev, key: e.target.value }))}
              />
              <Input
                placeholder="Expression"
                value={formulaDraft.expression}
                onChange={(e) =>
                  setFormulaDraft((prev) => ({ ...prev, expression: e.target.value }))
                }
              />
              <div className="md:col-span-3 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addFormula}>
                  Add formula
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              {(form.formulas ?? []).map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-xs text-muted-foreground">{f.key}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {f.expression}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeFormula(f.key)}>
                    Remove
                  </Button>
                </div>
              ))}
              {(form.formulas ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No formulas yet.</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
