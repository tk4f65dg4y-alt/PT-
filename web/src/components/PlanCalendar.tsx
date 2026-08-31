export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayId: string;
  label: string;
  done: boolean;
  total: number;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toMonday(d: Date) {
  const copy = new Date(d);
  const day = (copy.getUTCDay() + 6) % 7; // 0 = Monday
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy;
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PlanCalendar({
  days,
  onSelectDay,
}: {
  days: CalendarDay[];
  onSelectDay?: (dayId: string) => void;
}) {
  if (days.length === 0) return null;

  const byDate = new Map(days.map((d) => [d.date, d]));
  const first = toMonday(new Date(days[0].date + "T00:00:00Z"));
  const last = new Date(days[days.length - 1].date + "T00:00:00Z");
  const weeks: Date[][] = [];
  let cursor = first;
  while (cursor <= last || weeks.length === 0) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    weeks.push(week);
    cursor = addDays(cursor, 7);
    if (cursor > last && weeks.length > 0) break;
  }

  const todayKey = isoDate(new Date());

  return (
    <div>
      <div className="calendar-grid" style={{ marginBottom: 4 }}>
        {DOW.map((d) => (
          <div className="calendar-dow" key={d}>
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div className="calendar-grid" key={wi} style={{ marginBottom: 6 }}>
          {week.map((date) => {
            const key = isoDate(date);
            const entry = byDate.get(key);
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            const classes = ["calendar-cell"];
            if (entry) {
              classes.push("workout");
              if (entry.done) classes.push("done");
              else if (isPast) classes.push("missed");
            }
            if (isToday) classes.push("today");
            return (
              <div
                key={key}
                className={classes.join(" ")}
                onClick={() => entry && onSelectDay?.(entry.dayId)}
                style={{ cursor: entry && onSelectDay ? "pointer" : "default" }}
                title={entry ? `${entry.label} — ${entry.done ? "done" : `${entry.total} exercises`}` : undefined}
              >
                <span>{date.getUTCDate()}</span>
                {entry && <span className="dot" />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
