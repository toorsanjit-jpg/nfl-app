type Props = {
  value: string;
  onChange: (val: string) => void;
};

export default function STCategorySelect({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <label className="font-medium">Category:</label>
      <select
        className="rounded border px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">All ST</option>
        <option value="fg">Field Goals</option>
        <option value="punt">Punts</option>
        <option value="kick">Kickoffs</option>
        <option value="punt_return">Punt Returns</option>
        <option value="kick_return">Kick Returns</option>
      </select>
    </div>
  );
}
