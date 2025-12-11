// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TabKey = "offense" | "defense" | "special";

type OffenseRow = {
  team_id: string;
  team_name: string;
  team_abbr: string;
  logo: string | null;
  games: number;
  points_for: number;
  total_yards: number;
  pass_yards: number;
  rush_yards: number;
  yards_per_play: number;
  turnovers: number;
};

type DefenseRow = {
  team_id: string;
  team_name: string;
  team_abbr: string;
  logo: string | null;
  games: number;
  points_allowed: number;
  total_yards_allowed: number;
  pass_yards_allowed: number;
  rush_yards_allowed: number;
  yards_per_play_allowed: number;
  takeaways: number;
};

type SpecialTeamsRow = {
  team_id: string;
  team_name: string;
  team_abbr: string;
  logo: string | null;
  games: number;
  punt_yds: number;
  punt_avg: number;
  kr_yds: number;
  kr_avg: number;
  pr_yds: number;
  pr_avg: number;
  kick_fg_pct: number;
  kick_points: number;
};

type Row = OffenseRow | DefenseRow | SpecialTeamsRow;
type SortDir = "asc" | "desc";

const TAB_LABELS: Record<TabKey, string> = {
  offense: "Team Offense",
  defense: "Team Defense",
  special: "Special Teams",
};

const TAB_API_PATH: Record<TabKey, string> = {
  offense: "/api/homepage/offense",
  defense: "/api/homepage/defense",
  special: "/api/homepage/special-teams",
};

const OFFENSE_COLUMNS: { key: keyof OffenseRow; label: string; align?: "right" }[] =
  [
    { key: "team_name", label: "Team" },
    { key: "games", label: "G", align: "right" },
    { key: "points_for", label: "Pts", align: "right" },
    { key: "total_yards", label: "Yds", align: "right" },
    { key: "pass_yards", label: "Pass", align: "right" },
    { key: "rush_yards", label: "Rush", align: "right" },
    { key: "yards_per_play", label: "Yds/Play", align: "right" },
    { key: "turnovers", label: "TO", align: "right" },
  ];

const DEFENSE_COLUMNS: { key: keyof DefenseRow; label: string; align?: "right" }[] =
  [
    { key: "team_name", label: "Team" },
    { key: "games", label: "G", align: "right" },
    { key: "points_allowed", label: "Pts Allowed", align: "right" },
    { key: "total_yards_allowed", label: "Yds Allowed", align: "right" },
    { key: "pass_yards_allowed", label: "Pass Allowed", align: "right" },
    { key: "rush_yards_allowed", label: "Rush Allowed", align: "right" },
    { key: "yards_per_play_allowed", label: "Yds/Play", align: "right" },
    { key: "takeaways", label: "Takeaways", align: "right" },
  ];

const SPECIAL_COLUMNS: {
  key: keyof SpecialTeamsRow;
  label: string;
  align?: "right";
}[] = [
  { key: "team_name", label: "Team" },
  { key: "games", label: "G", align: "right" },
  { key: "punt_yds", label: "Punt Yds", align: "right" },
  { key: "punt_avg", label: "Punt Avg", align: "right" },
  { key: "kr_yds", label: "KR Yds", align: "right" },
  { key: "kr_avg", label: "KR Avg", align: "right" },
  { key: "pr_yds", label: "PR Yds", align: "right" },
  { key: "pr_avg", label: "PR Avg", align: "right" },
  { key: "kick_fg_pct", label: "FG %", align: "right" },
  { key: "kick_points", label: "K Pts", align: "right" },
];

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "—";
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(digits);
}

export default function Home() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("offense");
  const [offenseData, setOffenseData] = useState<OffenseRow[]>([]);
  const [defenseData, setDefenseData] = useState<DefenseRow[]>([]);
  const [specialData, setSpecialData] = useState<SpecialTeamsRow[]>([]);
  const [loadingTab, setLoadingTab] = useState<TabKey | null>("offense");
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<string>("points_for");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // initial load
  useEffect(() => {
    fetchTabData("offense");
  }, []);

  // change default sort when switching tabs
  useEffect(() => {
    if (activeTab === "offense") {
      setSortKey("points_for");
      setSortDir("desc");
    } else if (activeTab === "defense") {
      setSortKey("points_allowed");
      setSortDir("asc"); // defense: lower is better
    } else if (activeTab === "special") {
      setSortKey("kick_points");
      setSortDir("desc");
    }
  }, [activeTab]);

  async function fetchTabData(tab: TabKey) {
    // already have data → just switch tab
    if (tab === "offense" && offenseData.length > 0) {
      setActiveTab(tab);
      return;
    }
    if (tab === "defense" && defenseData.length > 0) {
      setActiveTab(tab);
      return;
    }
    if (tab === "special" && specialData.length > 0) {
      setActiveTab(tab);
      return;
    }

    setLoadingTab(tab);
    setError(null);

    try {
      const res = await fetch(TAB_API_PATH[tab]);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load ${tab} data`);
      }
      const json = await res.json();

      if (!json || !Array.isArray(json.data)) {
        throw new Error("Unexpected response shape from API");
      }

      if (tab === "offense") {
        setOffenseData(json.data as OffenseRow[]);
      } else if (tab === "defense") {
        setDefenseData(json.data as DefenseRow[]);
      } else {
        setSpecialData(json.data as SpecialTeamsRow[]);
      }

      setActiveTab(tab);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoadingTab(null);
    }
  }

  function handleSort(nextKey: string) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("desc");
    }
  }

  function getActiveData(): Row[] {
    if (activeTab === "offense") return offenseData;
    if (activeTab === "defense") return defenseData;
    return specialData;
  }

  function getColumns() {
    if (activeTab === "offense") return OFFENSE_COLUMNS;
    if (activeTab === "defense") return DEFENSE_COLUMNS;
    return SPECIAL_COLUMNS;
  }

  const rows = [...getActiveData()].sort((a: any, b: any) => {
    const va = a[sortKey];
    const vb = b[sortKey];

    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    if (typeof va === "number" && typeof vb === "number") {
      return sortDir === "asc" ? va - vb : vb - va;
    }

    const sa = String(va);
    const sb = String(vb);
    return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });

  const columns = getColumns();

  return (
    <main className="min-h-screen bg-[#F7F7F7] text-[#0A0A0A]">
      {/* HERO */}
      <section className="w-full py-10 md:py-16 border-b border-black/5 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
                NFL Team Dashboard
              </h1>
              <p className="text-sm md:text-base text-black/60 max-w-xl">
                Clean, fast team-level offense, defense, and special teams stats.
                Click a team to dive into full filters and play-by-play.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* CTA for custom stats (locked behind login later) */}
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-black/10 bg-black text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-black/90 transition"
                onClick={() => {
                  // For now, teaser only. Later we gate this on auth.
                  window.alert(
                    "Custom stat builder is for logged-in users. Sign in to unlock it (coming soon)."
                  );
                }}
              >
                Build custom stat
              </button>
              <span className="hidden md:inline text-xs text-black/50">
                Log in to create custom columns like
                {" “3rd down pass EPA”"}.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TABS + TABLE */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="inline-flex rounded-full bg-white border border-black/10 p-1 mb-6">
          {(["offense", "defense", "special"] as TabKey[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => fetchTabData(tab)}
                className={`px-4 py-1.5 text-xs md:text-sm rounded-full transition ${
                  isActive
                    ? "bg-[#0A0A0A] text-white shadow-sm"
                    : "text-black/60 hover:text-black"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  {columns.map((col) => {
                    const isSorted = sortKey === col.key;
                    return (
                      <th
                        key={col.key as string}
                        onClick={() => handleSort(col.key as string)}
                        className={`whitespace-nowrap px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-semibold uppercase tracking-wide cursor-pointer select-none ${
                          col.align === "right"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {isSorted && (
                            <span className="text-[9px] md:text-[10px] text-black/50">
                              {sortDir === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {loadingTab === activeTab && rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-6 text-center text-black/40 text-sm"
                    >
                      Loading {TAB_LABELS[activeTab]}…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-6 text-center text-black/40 text-sm"
                    >
                      No data yet. Import some games first.
                    </td>
                  </tr>
                ) : (
                  rows.map((row: any) => (
                    <tr
                      key={row.team_id}
                      className="border-t border-black/5 hover:bg-[#FAFAFA] cursor-pointer transition"
                      onClick={() => {
                        router.push(`/teams/${row.team_id}`);
                      }}
                    >
                      {columns.map((col) => {
                        const raw = row[col.key as string];
                        const isTeamCol = col.key === "team_name";
                        return (
                          <td
                            key={col.key as string}
                            className={`px-3 md:px-4 py-2 md:py-3 ${
                              col.align === "right"
                                ? "text-right"
                                : "text-left"
                            } text-xs md:text-sm`}
                          >
                            {isTeamCol ? (
                              <div className="flex items-center gap-2">
                                {row.logo && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={row.logo}
                                    alt={row.team_abbr}
                                    className="h-5 w-5 md:h-6 md:w-6 rounded-full border border-black/10 bg-white object-contain"
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {row.team_name}
                                  </span>
                                  <span className="text-[10px] text-black/40 uppercase">
                                    {row.team_abbr}
                                  </span>
                                </div>
                              </div>
                            ) : typeof raw === "number" ? (
                              <span className="tabular-nums">
                                {formatNumber(
                                  raw,
                                  col.key
                                    .toString()
                                    .includes("avg") ||
                                    col.key
                                      .toString()
                                      .includes("yards_per_play")
                                    ? 1
                                    : 0
                                )}
                              </span>
                            ) : (
                              (raw ?? "—")
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sub-footer hint */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-black/5 text-[11px] md:text-xs text-black/50">
            <span>
              Click any team row to open its full dashboard (filters, play-by-play, and premium stats).
            </span>
            <Link
              href="/live"
              className="hidden md:inline-flex items-center gap-1 text-black/60 hover:text-black"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live game view
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
