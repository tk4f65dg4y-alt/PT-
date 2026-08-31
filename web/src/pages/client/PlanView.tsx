import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import PlanCalendar, { CalendarDay } from "../../components/PlanCalendar";

interface Exercise {
  id: string;
  completions: { id: string }[];
}
interface Day {
  id: string;
  label: string;
  exercises: Exercise[];
}
interface Week {
  id: string;
  label: string;
  days: Day[];
}
interface PlanData {
  id: string;
  title: string;
  notes: string | null;
  startDate: string | null;
  expiresAt: string | null;
  priceLabel: string | null;
  weeks: Week[];
}

export default function ClientPlanView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    api.get(`/client/plans/${id}`).then(setPlan).catch((e) => setError(e.message));
  }, [id]);

  const calendarDays: CalendarDay[] = useMemo(() => {
    if (!plan?.startDate) return [];
    const flat = plan.weeks.flatMap((w) => w.days);
    const start = new Date(plan.startDate);
    return flat.map((day, i) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      const done = day.exercises.length > 0 && day.exercises.every((e) => e.completions.length > 0);
      return { date: date.toISOString().slice(0, 10), dayId: day.id, label: day.label, done, total: day.exercises.length };
    });
  }, [plan]);

  if (error) return <div className="content"><div className="error-box">{error}</div></div>;
  if (!plan) return <div className="empty">Loading…</div>;

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate("/")} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>{plan.title}</h1>
        </div>
      </div>
      <div className="content">
        {(plan.notes || plan.priceLabel || plan.expiresAt) && (
          <div className="card small">
            {plan.notes && <div>{plan.notes}</div>}
            {(plan.priceLabel || plan.expiresAt) && (
              <div className="list-row" style={{ marginTop: plan.notes ? 8 : 0 }}>
                {plan.priceLabel && <span className="badge accent">{plan.priceLabel}</span>}
                {plan.expiresAt && (
                  <span className="badge">Expires {new Date(plan.expiresAt).toLocaleDateString()}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="tabs">
          <div className={`tab ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
            List
          </div>
          <div
            className={`tab ${view === "calendar" ? "active" : ""}`}
            onClick={() => plan.startDate && setView("calendar")}
            style={{ opacity: plan.startDate ? 1 : 0.4 }}
          >
            Calendar
          </div>
        </div>

        {view === "calendar" ? (
          plan.startDate ? (
            <div className="card">
              <PlanCalendar days={calendarDays} onSelectDay={(dayId) => navigate(`/plans/${plan.id}/days/${dayId}`)} />
            </div>
          ) : (
            <div className="empty">This plan has no start date, so a calendar view isn't available.</div>
          )
        ) : (
          plan.weeks.map((week) => (
            <div className="week-block" key={week.id}>
              <div className="week-title">{week.label}</div>
              {week.days.map((day) => {
                const done = day.exercises.filter((e) => e.completions.length > 0).length;
                const total = day.exercises.length;
                const complete = total > 0 && done === total;
                return (
                  <Link key={day.id} to={`/plans/${plan.id}/days/${day.id}`} className="card tap" style={{ display: "block" }}>
                    <div className="list-row">
                      <div style={{ fontWeight: 700 }}>{day.label}</div>
                      <span className={`badge ${complete ? "good" : ""}`}>
                        {complete ? "Done" : `${done}/${total}`}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="progress-bar">
                        <div style={{ width: `${(done / total) * 100}%` }} />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
