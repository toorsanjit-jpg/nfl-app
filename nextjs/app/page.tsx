// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeamOffenseRow = {
  team_id: string; // matches teams.id, e.g. "DAL"
  team_name: string;
  team_abbr: string;
  games: number;
  total_yards: number;
  pass_yards: number;
  rush_yards: number;
  rec_yards: number;
  points: number;
};

type TeamDefenseRow = {
  team_id: string;
  team_name: string;
  team_abbr: string;
  yards_allowed: number;
  pass_yards_allowed: number;
  rush_yards_allowed: number;
  points_allowed: number;
};

type TeamSpecialTeamsRow = {
  team_id: string;
  team_name: string;
  team_abbr: string;
  punts: number;
  punt_avg: number;
  kick_returns: number;
  kick_return_avg: number;
  fg_made: number;
  fg_attempts: number;
};

// TODO: replace these with real Supabase data from views like
// view_team_offense_stats, view_team_defense_stats, view_team_special_teams_stats
const mockOffenseData: TeamOffenseRow[] = [
  {
    team_id: "DAL",
    team_name: "Dallas Cowboys",
    team_abbr: "DAL",
    games: 3,
    total_yards: 1200,
    pass_yards: 800,
    rush_yards: 350,
    rec_yards: 780,
    points: 90,
  },
  {
    team_id: "PHI",
    team_name: "Philadelphia Eagles",
    team_abbr: "PHI",
    games: 3,
    total_yards: 1100,
    pass_yards: 750,
    rush_yards: 320,
    rec_yards: 720,
    points: 82,
  },
];

const mockDefenseData: TeamDefenseRow[] = [
  {
    team_id: "DAL",
    team_name: "Dallas Cowboys",
    team_abbr: "DAL",
    yards_allowed: 850,
    pass_yards_allowed: 550,
    rush_yards_allowed: 300,
    points_allowed: 55,
  },
  {
    team_id: "PHI",
    team_name: "Philadelphia Eagles",
    team_abbr: "PHI",
    yards_allowed: 930,
    pass_yards_allowed: 600,
    rush_yards_allowed: 330,
    points_allowed: 65,
  },
];

const mockSpecialTeamsData: TeamSpecialTeamsRow[] = [
  {
    team_id: "DAL",
    team_name: "Dallas Cowboys",
    team_abbr: "DAL",
    punts: 12,
    punt_avg: 47.2,
    kick_returns: 5,
    kick_return_avg: 24.3,
    fg_made: 8,
    fg_attempts: 9,
  },
  {
    team_id: "PHI",
    team_name: "Philadelphia Eagles",
    team_abbr: "PHI",
    punts: 10,
    punt_avg: 45.1,
    kick_returns: 4,
    kick_return_avg: 22.0,
    fg_made: 7,
    fg_attempts: 8,
  },
];

type MainTab = "offense" | "defense" | "special-teams" | "advanced";
type OffenseSubTab = "passing" | "rushing" | "receiving";
type SpecialTeamsSubTab = "punt" | "kick" | "returns" | "fg";

export default function HomePage() {
  const [mainTab, setMainTab] = useState<MainTab>("offense");
  const [offenseSubTab, setOffenseSubTab] =
    useState<OffenseSubTab>("passing");
  const [specialSubTab, setSpecialSubTab] =
    useState<SpecialTeamsSubTab>("punt");

  const router = useRouter();

  const handleTeamClick = (teamId: string) => {
    // /teams/[teamId] already exists in your app
    router.push(`/teams/${teamId}`);
  };

  const handleStatClick = (teamId: string) => {
    // Go to your existing Play Explorer, filtered by team
    const search = new URLSearchParams({ teamId }).toString();
    router.push(`/plays?${search}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar / brand */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
              NFL
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                NFL Analytics Engine
              </span>
              <span className="text-xs text-slate-500">
                Team offense, defense, and special teams in one place.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              Guest
            </span>
            <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
              Sign in
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Hero / filters */}
        <section className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Team Leaderboards
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Offense, defense, and special teams. Click a team or stat to jump
              into deeper splits and play-by-play.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <button className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100">
              Season: 2025
            </button>
            <button className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-100">
              Week: All
            </button>
          </div>
        </section>

        {/* Main tabs */}
        <section className="mb-4">
          <nav className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-600">
            <TabChip
              label="Offense"
              active={mainTab === "offense"}
              onClick={() => setMainTab("offense")}
            />
            <TabChip
              label="Defense"
              active={mainTab === "defense"}
              onClick={() => setMainTab("defense")}
            />
            <TabChip
              label="Special Teams"
              active={mainTab === "special-teams"}
              onClick={() => setMainTab("special-teams")}
            />
            <TabChip
              label="Advanced"
              active={mainTab === "advanced"}
              onClick={() => setMainTab("advanced")}
              locked
            />
          </nav>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {mainTab === "offense" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-full bg-slate-50 p-1 text-xs font-medium text-slate-600">
                  <SubTabChip
                    label="Passing"
                    active={offenseSubTab === "passing"}
                    onClick={() => setOffenseSubTab("passing")}
                  />
                  <SubTabChip
                    label="Rushing"
                    active={offenseSubTab === "rushing"}
                    onClick={() => setOffenseSubTab("rushing")}
                  />
                  <SubTabChip
                    label="Receiving"
                    active={offenseSubTab === "receiving"}
                    onClick={() => setOffenseSubTab("receiving")}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  Click team name for team page. Click a stat for play-by-play.
                </span>
              </div>

              <TeamOffenseTable
                data={mockOffenseData}
                mode={offenseSubTab}
                onTeamClick={handleTeamClick}
                onStatClick={handleStatClick}
              />
            </div>
          )}

          {mainTab === "defense" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Team Defense – Season Totals
                </h2>
                <span className="text-xs text-slate-400">
                  Aggregated from opponent offensive drives & plays.
                </span>
              </div>
              <TeamDefenseTable
                data={mockDefenseData}
                onTeamClick={handleTeamClick}
                onStatClick={handleStatClick}
              />
            </div>
          )}

          {mainTab === "special-teams" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-full bg-slate-50 p-1 text-xs font-medium text-slate-600">
                  <SubTabChip
                    label="Punt"
                    active={specialSubTab === "punt"}
                    onClick={() => setSpecialSubTab("punt")}
                  />
                  <SubTabChip
                    label="Kick"
                    active={specialSubTab === "kick"}
                    onClick={() => setSpecialSubTab("kick")}
                  />
                  <SubTabChip
                    label="Returns"
                    active={specialSubTab === "returns"}
                    onClick={() => setSpecialSubTab("returns")}
                  />
                  <SubTabChip
                    label="Field Goals"
                    active={specialSubTab === "fg"}
                    onClick={() => setSpecialSubTab("fg")}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  Special teams efficiency by team.
                </span>
              </div>

              <TeamSpecialTeamsTable
                data={mockSpecialTeamsData}
                mode={specialSubTab}
                onTeamClick={handleTeamClick}
                onStatClick={handleStatClick}
              />
            </div>
          )}

          {mainTab === "advanced" && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                <span className="mr-1">🔒</span> Premium Area
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                Advanced metrics are for logged-in users.
              </h2>
              <p className="max-w-sm text-xs text-slate-500">
                EPA, success rate, coverage metrics, pass-rush win rates and
                more will live here. Gate this with Supabase Auth or whatever
                auth provider you prefer.
              </p>
              <button className="mt-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-black">
                Sign in to unlock
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

type ChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  locked?: boolean;
};

function TabChip({ label, active, onClick, locked }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-1 rounded-full px-3 py-1 text-xs transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      ].join(" ")}
    >
      {locked && <span>🔒</span>}
      <span>{label}</span>
    </button>
  );
}

function SubTabChip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// Tables

type TeamOffenseTableProps = {
  data: TeamOffenseRow[];
  mode: OffenseSubTab;
  onTeamClick: (teamId: string) => void;
  onStatClick: (teamId: string) => void;
};

function TeamOffenseTable({
  data,
  mode,
  onTeamClick,
  onStatClick,
}: TeamOffenseTableProps) {
  const metricLabel =
    mode === "passing"
      ? "Pass Yds"
      : mode === "rushing"
      ? "Rush Yds"
      : "Rec Yds";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Team</th>
            <th className="px-3 py-2 text-right font-medium">G</th>
            <th className="px-3 py-2 text-right font-medium">Total Yds</th>
            <th className="px-3 py-2 text-right font-medium">
              {metricLabel}
            </th>
            <th className="px-3 py-2 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const value =
              mode === "passing"
                ? row.pass_yards
                : mode === "rushing"
                ? row.rush_yards
                : row.rec_yards;

            return (
              <tr
                key={row.team_id}
                className={`border-t border-slate-100 ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <td className="px-3 py-2">
                  <button
                    className="flex items-center gap-2 text-left text-xs font-medium text-slate-900 hover:underline"
                    onClick={() => onTeamClick(row.team_id)}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                      {row.team_abbr}
                    </span>
                    <span>{row.team_name}</span>
                  </button>
                </td>
                <td className="px-3 py-2 text-right text-slate-700">
                  {row.games}
                </td>
                <td
                  className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                  onClick={() => onStatClick(row.team_id)}
                >
                  {row.total_yards.toLocaleString()}
                </td>
                <td
                  className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                  onClick={() => onStatClick(row.team_id)}
                >
                  {value.toLocaleString()}
                </td>
                <td
                  className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                  onClick={() => onStatClick(row.team_id)}
                >
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type TeamDefenseTableProps = {
  data: TeamDefenseRow[];
  onTeamClick: (teamId: string) => void;
  onStatClick: (teamId: string) => void;
};

function TeamDefenseTable({
  data,
  onTeamClick,
  onStatClick,
}: TeamDefenseTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Team</th>
            <th className="px-3 py-2 text-right font-medium">
              Yds Allowed
            </th>
            <th className="px-3 py-2 text-right font-medium">
              Pass Yds A
            </th>
            <th className="px-3 py-2 text-right font-medium">
              Rush Yds A
            </th>
            <th className="px-3 py-2 text-right font-medium">
              Pts Allowed
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.team_id}
              className={`border-t border-slate-100 ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              }`}
            >
              <td className="px-3 py-2">
                <button
                  className="flex items-center gap-2 text-left text-xs font-medium text-slate-900 hover:underline"
                  onClick={() => onTeamClick(row.team_id)}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                    {row.team_abbr}
                  </span>
                  <span>{row.team_name}</span>
                </button>
              </td>
              <td
                className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                onClick={() => onStatClick(row.team_id)}
              >
                {row.yards_allowed.toLocaleString()}
              </td>
              <td
                className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                onClick={() => onStatClick(row.team_id)}
              >
                {row.pass_yards_allowed.toLocaleString()}
              </td>
              <td
                className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                onClick={() => onStatClick(row.team_id)}
              >
                {row.rush_yards_allowed.toLocaleString()}
              </td>
              <td
                className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                onClick={() => onStatClick(row.team_id)}
              >
                {row.points_allowed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type TeamSpecialTeamsTableProps = {
  data: TeamSpecialTeamsRow[];
  mode: SpecialTeamsSubTab;
  onTeamClick: (teamId: string) => void;
  onStatClick: (teamId: string) => void;
};

function TeamSpecialTeamsTable({
  data,
  mode,
  onTeamClick,
  onStatClick,
}: TeamSpecialTeamsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Team</th>
            {mode === "punt" && (
              <>
                <th className="px-3 py-2 text-right font-medium">Punts</th>
                <th className="px-3 py-2 text-right font-medium">
                  Punt Avg
                </th>
              </>
            )}
            {mode === "kick" && (
              <>
                <th className="px-3 py-2 text-right font-medium">
                  FGs Made
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  FGs Att
                </th>
              </>
            )}
            {mode === "returns" && (
              <>
                <th className="px-3 py-2 text-right font-medium">KR</th>
                <th className="px-3 py-2 text-right font-medium">
                  KR Avg
                </th>
              </>
            )}
            {mode === "fg" && (
              <>
                <th className="px-3 py-2 text-right font-medium">
                  FGs Made
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  FGs Att
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.team_id}
              className={`border-t border-slate-100 ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              }`}
            >
              <td className="px-3 py-2">
                <button
                  className="flex items-center gap-2 text-left text-xs font-medium text-slate-900 hover:underline"
                  onClick={() => onTeamClick(row.team_id)}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                    {row.team_abbr}
                  </span>
                  <span>{row.team_name}</span>
                </button>
              </td>

              {mode === "punt" && (
                <>
                  <td
                    className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                    onClick={() => onStatClick(row.team_id)}
                  >
                    {row.punts}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                    onClick={() => onStatClick(row.team_id)}
                  >
                    {row.punt_avg.toFixed(1)}
                  </td>
                </>
              )}

              {mode === "kick" && (
                <>
                  <td
                    className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                    onClick={() => onStatClick(row.team_id)}
                  >
                    {row.fg_made}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                    onClick={() => onStatClick(row.team_id)}
                  >
                    {row.fg_attempts}
                  </td>
                </>
              )}

              {mode === "returns" && (
                <>
                  <td
                    className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                    onClick={() => onStatClick(row.team_id)}
                  >
                    {row.kick_returns}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                    onClick={() => onStatClick(row.team_id)}
                  >
                    {row.kick_return_avg.toFixed(1)}
                  </td>
                </>
              )}

              {mode === "fg" && (
                <>
                  <td
                    className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                    onClick={() => onStatClick(row.team_id)}
                  >
                    {row.fg_made}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-right text-slate-900 hover:underline"
                    onClick={() => onStatClick(row.team_id)}
                  >
                    {row.fg_attempts}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
