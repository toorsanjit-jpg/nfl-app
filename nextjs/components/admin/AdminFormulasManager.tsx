"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminFormula } from "@/types/admin";

type Props = {
  initial: AdminFormula[];
};

const defaultFormula: AdminFormula = {
  formula_key: "",
  label: "",
  description: "",
  sql_expression: "",
  applies_to: "offense",
  is_premium: true,
  is_enabled: true,
};

export function AdminFormulasManager({ initial }: Props) {
  const [items, setItems] = useState<AdminFormula[]>(initial);
  const [form, setForm] = useState<AdminFormula>(defaultFormula);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const handleChange = (key: keyof AdminFormula, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/formulas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json?._meta?.error || "Failed to save formula");
      return;
    }
    if (json.saved) {
      const next = items.filter((i) => i.formula_key !== json.saved.formula_key);
      setItems([json.saved as AdminFormula, ...next]);
      setMessage("Saved.");
    }
  };

  const remove = async (key: string) => {
    if (!confirm(`Delete formula ${key}?`)) return;
    setMessage(null);
    const res = await fetch(`/api/admin/formulas/${key}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.deleted) {
      setMessage(json?._meta?.error || "Failed to delete");
      return;
    }
    setItems(items.filter((i) => i.formula_key !== key));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Formula key</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.formula_key}
            onChange={(e) => handleChange("formula_key", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Label</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.label}
            onChange={(e) => handleChange("label", e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">SQL expression</label>
          <textarea
            className="w-full rounded border px-2 py-1 text-sm"
            rows={3}
            placeholder="(case when calc_is_pass then 1 else 0 end)"
            value={form.sql_expression}
            onChange={(e) => handleChange("sql_expression", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Applies to</label>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.applies_to}
            onChange={(e) => handleChange("applies_to", e.target.value as any)}
          >
            <option value="offense">Offense</option>
            <option value="defense">Defense</option>
            <option value="special">Special</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_premium}
              onChange={(e) => handleChange("is_premium", e.target.checked)}
            />
            Premium only
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_enabled}
              onChange={(e) => handleChange("is_enabled", e.target.checked)}
            />
            Enabled
          </label>
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <Button type="button" size="sm" onClick={save}>
            Save / Update
          </Button>
          {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left">Key</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left">Applies</th>
              <th className="px-3 py-2 text-left">Premium</th>
              <th className="px-3 py-2 text-left">Enabled</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.formula_key} className="border-t">
                <td className="px-3 py-2 font-mono">{i.formula_key}</td>
                <td className="px-3 py-2">{i.label}</td>
                <td className="px-3 py-2">{i.applies_to}</td>
                <td className="px-3 py-2">{i.is_premium ? "Yes" : "No"}</td>
                <td className="px-3 py-2">{i.is_enabled ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setForm({ ...i });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(i.formula_key)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
