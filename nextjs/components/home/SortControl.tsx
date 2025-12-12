type Props = {
  value: string;
  onChange: (val: string) => void;
};

export default function SortControl({ value, onChange }: Props) {
  return (
    <div className="text-sm">
      <label className="mr-2 font-medium">Sort By:</label>
      <select
        className="rounded border px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="total_yards">Total Yards</option>
        <option value="plays">Plays</option>
        <option value="yards_per_play">Yds / Play</option>
      </select>
    </div>
  );
}
