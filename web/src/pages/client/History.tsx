import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

interface CompletionRow {
  id: string;
  completedAt: string;
  exercise: { name: string; day: { label: string; week: { label: string; plan: { title: string } } } };
}
interface SessionRow {
  id: string;
  startedAt: string;
  durationSeconds: number | null;
  day: { label: string; week: { label: string; plan: { title: string } } };
}

export default function History() {
  const navigate = useNavigate();
  const [data, setData] = useState<{ completions: CompletionRow[]; sessions: SessionRow[] } | null>(null);
  const [tab, setTab] = useState<"workouts" | "exercises">("workouts");

  useEffect(() => {
    api.get("/client/history").then(setData);
  }, []);

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate("/")} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>History</h1>
        </div>
      </div>
      <div className="content">
        <div className="tabs">
          <div className={`tab ${tab === "workouts" ? "active" : ""}`} onClick={() => setTab("workouts")}>
            Workouts
          </div>
          <div className={`tab ${tab === "exercises" ? "active" : ""}`} onClick={() => setTab("exercises")}>
            Exercises
          </div>
        </div>

        {!data ? (
          <div className="empty">Loading…</div>
        ) : tab === "workouts" ? (
          data.sessions.length === 0 ? (
            <div className="empty">No workouts logged yet.</div>
          ) : (
            data.sessions.map((s) => (
              <div className="card" key={s.id}>
                <div className="list-row">
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.day.label}</div>
                    <div className="small muted">
                      {s.day.week.plan.title} · {s.day.week.label}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="small">{new Date(s.startedAt).toLocaleDateString()}</div>
                    {s.durationSeconds != null && (
                      <div className="small muted">
                        {Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : data.completions.length === 0 ? (
          <div className="empty">No exercises completed yet.</div>
        ) : (
          data.completions.map((c) => (
            <div className="card" key={c.id}>
              <div className="list-row">
                <div>
                  <div style={{ fontWeight: 700 }}>{c.exercise.name}</div>
                  <div className="small muted">
                    {c.exercise.day.week.plan.title} · {c.exercise.day.label}
                  </div>
                </div>
                <div className="small">{new Date(c.completedAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
