type Props = {
  value: string;
  onChange: (val: string) => void;
};

export default function SeasonFilter({ value, onChange }: Props) {
  return (
    <div className="text-sm">
      <label className="mr-2 font-medium">Season:</label>
      <select
        className="rounded border px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option>2023</option>
        <option>2024</option>
        <option>2025</option>
      </select>
    </div>
  );
}
