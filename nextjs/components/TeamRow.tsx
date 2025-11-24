"use client";

interface Team {
  id: string;
  display_name: string;
}

export function TeamRow({ team }: { team: Team }) {
  return (
    <tr
      className="border-b border-gray-300 hover:bg-gray-100 cursor-pointer"
      onClick={() => {
        window.location.href = `/teams/${team.team_id}`;
      }}
    >
      <td className="p-4 font-bold">{team.team_id}</td>
      <td className="p-4">{team.games}</td>
      <td className="p-4">{team.points_per_game.toFixed(1)}</td>
      <td className="p-4">{team.yards_per_game.toFixed(1)}</td>
      <td className="p-4">{team.passing_yards_per_game.toFixed(1)}</td>
      <td className="p-4">{team.rushing_yards_per_game.toFixed(1)}</td>
      <td className="p-4">{team.yards_per_play_avg.toFixed(2)}</td>
      <td className="p-4">{(team.third_down_eff_avg * 100).toFixed(1)}%</td>
      <td className="p-4">{(team.fourth_down_eff_avg * 100).toFixed(1)}%</td>
      <td className="p-4">{team.turnovers_per_game.toFixed(2)}</td>
      <td className="p-4">{team.sacks_per_game.toFixed(2)}</td>
    </tr>
  );
}
