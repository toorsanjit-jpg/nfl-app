"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import type { SavedView, SavedViewCategory, SavedViewScope } from "@/types/userSaved";
import { Button } from "@/components/ui/button";

type SavedViewsDropdownProps = {
  basePath: string;
  scope: SavedViewScope;
  teamId?: string;
  category: SavedViewCategory;
  currentFilters: Record<string, any>;
  tier: "anonymous" | "free" | "premium";
};

type RemoteResponse = { views?: SavedView[]; _meta?: Record<string, any> };

function toSearchParams(filters: Record<string, any>) {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) return;
    params.set(key, typeof value === "boolean" ? (value ? "true" : "false") : String(value));
  });
  return params;
}

export function SavedViewsDropdown(props: SavedViewsDropdownProps) {
  const { basePath, scope, teamId, category, currentFilters, tier } = props;
  const router = useRouter();
  const canUseSavedViews = tier === "premium";

  const [views, setViews] = useState<SavedView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterPayload = useMemo(
    () => ({ ...(currentFilters || {}) }),
    [currentFilters]
  );

  useEffect(() => {
    if (!canUseSavedViews) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({
      scope,
      category,
    });
    if (teamId) qs.set("teamId", teamId);

    fetch(`/api/savedViews?${qs.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const json = (await res.json()) as RemoteResponse;
        if (!res.ok) {
          throw new Error(json._meta?.error || "Failed to load saved views");
        }
        setViews(json.views ?? []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(String(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [scope, category, teamId, canUseSavedViews]);

  const selectedView = views.find((v) => v.id === selectedId) || null;

  function openUpgrade() {
    setModalOpen(true);
  }

  function applyFilters(filters: Record<string, any>) {
    const params = toSearchParams(filters);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  async function saveView(existing?: SavedView | null) {
    if (!canUseSavedViews) {
      openUpgrade();
      return;
    }
    const name = prompt("Name this view", existing?.name ?? "");
    if (!name) return;

    const payload = {
      id: existing?.id,
      name,
      scope,
      category,
      teamId: scope === "team" ? teamId ?? null : null,
      filters: existing?.filters ?? filterPayload,
    };

    setLoading(true);
    setError(null);
    const res = await fetch("/api/savedViews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?._meta?.error || "Could not save view");
      setLoading(false);
      return;
    }

    const saved = json.saved as SavedView;
    const next = existing
      ? views.map((v) => (v.id === saved.id ? saved : v))
      : [saved, ...views];
    setViews(next);
    setSelectedId(saved.id);
    setLoading(false);
  }

  async function deleteView() {
    if (!selectedView || !canUseSavedViews) {
      openUpgrade();
      return;
    }
    if (!confirm(`Delete saved view "${selectedView.name}"?`)) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/savedViews/${selectedView.id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok || !json.deleted) {
      setError(json?._meta?.error || "Could not delete view");
      setLoading(false);
      return;
    }

    setViews(views.filter((v) => v.id !== selectedView.id));
    setSelectedId(null);
    setLoading(false);
  }

  function handleSelect(id: string) {
    if (!canUseSavedViews) {
      openUpgrade();
      return;
    }
    setSelectedId(id);
    const view = views.find((v) => v.id === id);
    if (view) applyFilters(view.filters || {});
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-muted-foreground">
          Saved Views
        </span>
        {!canUseSavedViews ? (
          <div
            className="flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-muted-foreground"
            onClick={openUpgrade}
          >
            <Lock className="h-3 w-3" />
            <span>Upgrade to save</span>
          </div>
        ) : (
          <>
            <select
              className="rounded-md border px-2 py-1"
              value={selectedId ?? ""}
              disabled={loading}
              onChange={(e) => handleSelect(e.target.value)}
            >
              <option value="">Load a view</option>
              {views.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => saveView(null)}
              disabled={loading}
            >
              Save current
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => saveView(selectedView)}
              disabled={loading || !selectedView}
            >
              Rename
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={deleteView}
              disabled={loading || !selectedView}
            >
              Delete
            </Button>
          </>
        )}
      </div>
      {error ? (
        <div className="text-xs text-red-500">{error}</div>
      ) : null}
      {modalOpen && (
        <div className="rounded-md border border-dashed bg-muted/50 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="h-4 w-4" />
            <span>Premium required</span>
          </div>
          <p className="mt-1 text-muted-foreground">
            Upgrade to unlock saved views and advanced filters.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/premium")}
            >
              View plans
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              Maybe later
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
