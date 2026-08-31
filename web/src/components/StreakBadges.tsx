export interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
  earned: boolean;
}
export interface ClientStats {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalExercises: number;
  lastActiveAt: string | null;
  badges: Badge[];
}

export default function StreakBadges({ stats, compact }: { stats: ClientStats; compact?: boolean }) {
  return (
    <div className="card">
      <div className="streak-hero" style={{ padding: compact ? 4 : undefined }}>
        <div className="streak-flame">{stats.currentStreak > 0 ? "🔥" : "💤"}</div>
        <div>
          <div className="streak-count">{stats.currentStreak}</div>
          <div className="streak-label">
            {stats.currentStreak === 1 ? "day streak" : "day streak"}
            {stats.longestStreak > stats.currentStreak && ` · best ${stats.longestStreak}`}
          </div>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="n">{stats.totalWorkouts}</div>
          <div className="l">Workouts</div>
        </div>
        <div className="stat-tile">
          <div className="n">{stats.totalExercises}</div>
          <div className="l">Exercises</div>
        </div>
        <div className="stat-tile">
          <div className="n">{stats.longestStreak}</div>
          <div className="l">Best streak</div>
        </div>
      </div>
      {!compact && (
        <div className="badge-grid">
          {stats.badges.map((b) => (
            <div key={b.id} className={`badge-tile ${b.earned ? "" : "locked"}`} title={b.description}>
              <div className="icon">{b.icon}</div>
              <div className="label">{b.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
