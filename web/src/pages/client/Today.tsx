import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import Logo from "../../components/Logo";
import StreakBadges, { ClientStats } from "../../components/StreakBadges";
import EnableNotifications from "../../components/EnableNotifications";
import ClientTabBar from "../../components/ClientTabBar";
import { MovementPattern } from "../../components/MovementAnimation";

interface Exercise {
  id: string;
  completions: { id: string }[];
  libraryItem: { pattern: MovementPattern } | null;
}
interface DaySession {
  id: string;
  endedAt: string | null;
}
interface Day {
  id: string;
  label: string;
  exercises: Exercise[];
  sessions: DaySession[];
}
interface Week {
  days: Day[];
}
interface PlanData {
  id: string;
  title: string;
  expiresAt: string | null;
  priceLabel: string | null;
  weeks: Week[];
}
interface HomeData {
  group: { id: string; name: string; coachNote: string | null; coachNoteAt: string | null } | null;
  plan: PlanData | null;
  todayDayId: string | null;
  stats: ClientStats;
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Today() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/client/home").then(setData).catch((e) => setError(e.message));
  }, []);

  const plan = data?.plan;
  const todayDay = plan?.weeks.flatMap((w) => w.days).find((d) => d.id === data?.todayDayId) || null;
  const done = todayDay?.exercises.filter((e) => e.completions.length > 0).length ?? 0;
  const total = todayDay?.exercises.length ?? 0;
  const inProgress = todayDay?.sessions.some((s) => !s.endedAt);

  return (
    <div className="app-shell with-tabbar">
      <div className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <h1>Hey {user?.name?.split(" ")[0]}</h1>
            <div className="sub">Casey Bond Personal Training</div>
          </div>
        </div>
        <button className="btn ghost" onClick={() => logout()}>
          Log out
        </button>
      </div>
      <div className="content">
        {error && <div className="error-box">{error}</div>}
        <EnableNotifications />

        {data?.group?.coachNote && (
          <div className="coach-note">
            <div className="coach-note-label">Note from Casey · {timeAgo(data.group.coachNoteAt)}</div>
            <div className="coach-note-body">"{data.group.coachNote}"</div>
          </div>
        )}

        {data === null ? (
          <div className="empty">Loading…</div>
        ) : !plan ? (
          <div className="hero-card">
            <div className="hero-kicker">Today</div>
            <div className="hero-title">No plan yet</div>
            <p className="muted small">Casey hasn't assigned a plan yet — check back soon.</p>
          </div>
        ) : !todayDay || total === 0 ? (
          <div className="hero-card">
            <div className="hero-kicker">Today</div>
            <div className="hero-title">Rest day</div>
            <p className="muted small">Nothing scheduled — recover, or take a look at your full plan.</p>
            <Link className="hero-link" to={`/plans/${plan.id}`}>
              View full plan →
            </Link>
          </div>
        ) : done === total ? (
          <div className="hero-card">
            <div className="hero-kicker">Today</div>
            <div className="hero-title">{todayDay.label}</div>
            <p className="hero-complete">✓ Fully completed</p>
            <div className="row">
              <Link className="btn secondary block" to={`/plans/${plan.id}/days/${todayDay.id}`}>
                View details
              </Link>
            </div>
          </div>
        ) : (
          <div className="hero-card">
            <div className="hero-kicker">Today</div>
            <div className="hero-title">{todayDay.label}</div>
            <p className="hero-meta">
              {total} exercise{total === 1 ? "" : "s"}
              {done > 0 && ` · ${done}/${total} done`}
            </p>
            <button
              className="btn block"
              onClick={() => navigate(`/plans/${plan.id}/days/${todayDay.id}/guided`)}
            >
              {inProgress ? "Resume session" : "Start session"}
            </button>
            <Link className="hero-link" to={`/plans/${plan.id}/days/${todayDay.id}`}>
              View details
            </Link>
          </div>
        )}

        {data?.stats && (
          <div className="stat-strip">
            <div className="stat-strip-item">
              <div className="stat-strip-n">{data.stats.currentStreak}</div>
              <div className="stat-strip-l">Day streak</div>
            </div>
            <div className="stat-strip-item">
              <div className="stat-strip-n">{data.stats.totalWorkouts}</div>
              <div className="stat-strip-l">Workouts</div>
            </div>
            <div className="stat-strip-item">
              <div className="stat-strip-n">{data.stats.totalExercises}</div>
              <div className="stat-strip-l">Exercises</div>
            </div>
          </div>
        )}

        {data?.stats && <StreakBadges stats={data.stats} badgesOnly />}

        {plan && (
          <Link to={`/plans/${plan.id}`} className="footer-link">
            View full plan →
          </Link>
        )}
      </div>
      <ClientTabBar />
    </div>
  );
}
