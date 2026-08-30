import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";

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
  weeks: Week[];
}

export default function ClientPlanView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/client/plans/${id}`).then(setPlan).catch((e) => setError(e.message));
  }, [id]);

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
        {plan.notes && <div className="card small">{plan.notes}</div>}
        {plan.weeks.map((week) => (
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
        ))}
      </div>
    </div>
  );
}
