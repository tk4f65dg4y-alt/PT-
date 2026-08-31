import { useState } from "react";

export interface LibraryItem {
  id: string;
  name: string;
  pattern: string;
  muscles: string;
  cue: string;
  defaultSets: number | null;
  defaultReps: string | null;
  defaultRest: number | null;
}

export default function ExercisePicker({
  items,
  value,
  onChange,
  onPick,
}: {
  items: LibraryItem[];
  value: string;
  onChange: (name: string) => void;
  onPick: (item: LibraryItem) => void;
}) {
  const [open, setOpen] = useState(false);

  const matches =
    value.trim().length > 0
      ? items.filter((i) => i.name.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 8)
      : items.slice(0, 8);

  return (
    <div className="picker-wrap">
      <input
        placeholder="Exercise name (search library or type your own)"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className="picker-menu">
          {matches.map((item) => (
            <div
              key={item.id}
              className="picker-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(item);
                setOpen(false);
              }}
            >
              <div className="name">{item.name}</div>
              <div className="meta">{item.muscles}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
