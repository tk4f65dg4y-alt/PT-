import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import MovementAnimation, { MovementPattern } from "../../components/MovementAnimation";
import PlanCalendar, { CalendarDay } from "../../components/PlanCalendar";

interface Completion {
  id: string;
  userId: string;
  completedAt: string;
  actualSets: number | null;
  actualReps: string | null;
  actualWeight: string | null;
}
interface Session {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}
interface Exercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  completions: Completion[];
  libraryItem: { pattern: MovementPattern; cue: string; muscles: string } | null;
}
interface Day {
  id: string;
  label: string;
  exercises: Exercise[];
  sessions: Session[];
}
interface Week {
  id: string;
  label: string;
  days: Day[];
}
interface Member {
  id: string;
  name: string;
  email: string;
}
interface PlanData {
  id: string;
  title: string;
  notes: string | null;
  startDate: string | null;
  expiresAt: string | null;
  priceLabel: string | null;
  archived: boolean;
  group: { id: string; members: { user: Member }[] };
  weeks: Week[];
}

function fmtDuration(s: number | null) {
  if (!s && s !== 0) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

export default function PlanView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [activeMember, setActiveMember] = useState<string>("");
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    api
      .get(`/admin/plans/${id}`)
      .then((p) => {
        setPlan(p);
        setActiveMember(p.group.members[0]?.user.id || "");
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const calendarDays: CalendarDay[] = useMemo(() => {
    if (!plan?.startDate) return [];
    const flat = plan.weeks.flatMap((w) => w.days);
    const start = new Date(plan.startDate);
    return flat.map((day, i) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      const done =
        day.exercises.length > 0 && day.exercises.every((e) => e.completions.some((c) => c.userId === activeMember));
      return { date: date.toISOString().slice(0, 10), dayId: day.id, label: day.label, done, total: day.exercises.length };
    });
  }, [plan, activeMember]);

  async function archive() {
    if (!plan) return;
    await api.put(`/admin/plans/${plan.id}`, { archived: !plan.archived });
    setPlan({ ...plan, archived: !plan.archived });
  }

  async function saveAsTemplate() {
    if (!plan) return;
    const title = prompt("Template name", plan.title);
    if (title === null) return;
    try {
      await api.post(`/admin/plans/${plan.id}/save-as-template`, { title });
      alert("Saved as a reusable template.");
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove() {
    if (!plan) return;
    if (!confirm("Delete this plan permanently? This cannot be undone.")) return;
    await api.del(`/admin/plans/${plan.id}`);
    navigate(`/admin/groups/${plan.group.id}`);
  }

  async function resetProgress() {
    if (!plan) return;
    if (!confirm("Reset progress? This clears every checkmark and workout timing on this plan for all members — the plan itself stays the same.")) {
      return;
    }
    await api.post(`/admin/plans/${plan.id}/reset`, {});
    const fresh = await api.get(`/admin/plans/${plan.id}`);
    setPlan(fresh);
  }

  if (error) return <div className="content"><div className="error-box">{error}</div></div>;
  if (!plan) return <div className="empty">Loading…</div>;

  const members = plan.group.members.map((m) => m.user);

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <div>
          <button
            className="btn ghost"
            onClick={() => navigate(`/admin/groups/${plan.group.id}`)}
            style={{ padding: 0, marginBottom: 4 }}
          >
            ← Back
          </button>
          <h1>{plan.title}</h1>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn secondary sm" onClick={() => navigate(`/admin/plans/${plan.id}/edit`)}>
            Edit
          </button>
          <button className="btn secondary sm" onClick={resetProgress}>
            ↺ Reset progress
          </button>
          <button className="btn secondary sm" onClick={saveAsTemplate}>
            Save as template
          </button>
          <button className="btn secondary sm" onClick={archive}>
            {plan.archived ? "Unarchive" : "Archive"}
          </button>
          <button className="btn danger sm" onClick={remove}>
            Delete
          </button>
        </div>
      </div>
      <div className="content">
        {(plan.notes || plan.priceLabel || plan.expiresAt) && (
          <div className="card small">
            {plan.notes && <div className="muted">{plan.notes}</div>}
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

        {members.length > 1 && (
          <div className="tabs">
            {members.map((m) => (
              <div
                key={m.id}
                className={`tab ${activeMember === m.id ? "active" : ""}`}
                onClick={() => setActiveMember(m.id)}
              >
                {m.name}
              </div>
            ))}
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

        {view === "calendar" && (
          plan.startDate ? (
            <div className="card">
              <PlanCalendar days={calendarDays} />
            </div>
          ) : (
            <div className="empty">This plan has no start date, so a calendar view isn't available.</div>
          )
        )}

        {view === "list" && plan.weeks.map((week) => (
          <div className="week-block" key={week.id}>
            <div className="week-title">{week.label}</div>
            {week.days.map((day) => {
              const done = day.exercises.filter((ex) =>
                ex.completions.some((c) => c.userId === activeMember)
              ).length;
              const total = day.exercises.length;
              const session = day.sessions.find((s) => s.userId === activeMember && s.durationSeconds != null);
              return (
                <div className="card" key={day.id}>
                  <div className="list-row">
                    <div style={{ fontWeight: 700 }}>{day.label}</div>
                    <span className={`badge ${done === total && total > 0 ? "good" : ""}`}>
                      {done}/{total}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="progress-bar">
                      <div style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                  )}
                  {session && (
                    <div className="small muted" style={{ marginTop: 6 }}>
                      Workout took {fmtDuration(session.durationSeconds)}
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    {day.exercises.map((ex) => {
                      const c = ex.completions.find((c) => c.userId === activeMember);
                      return (
                        <div className="exercise-row" key={ex.id}>
                          <div className={`checkbox ${c ? "checked" : ""}`}>{c ? "✓" : ""}</div>
                          {ex.libraryItem && <MovementAnimation pattern={ex.libraryItem.pattern} size={38} />}
                          <div style={{ flex: 1 }}>
                            <div className={`exercise-name ${c ? "done" : ""}`}>{ex.name}</div>
                            <div className="exercise-meta">
                              {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight]
                                .filter(Boolean)
                                .join(" · ")}
                              {ex.libraryItem?.muscles && (
                                <span className="badge accent" style={{ marginLeft: 6 }}>
                                  {ex.libraryItem.muscles}
                                </span>
                              )}
                            </div>
                            {ex.libraryItem?.cue && (
                              <div className="small muted" style={{ marginTop: 4 }}>
                                <span className="cue-label">Technique </span>
                                {ex.libraryItem.cue}
                              </div>
                            )}
                            {c && (
                              <div className="small muted" style={{ marginTop: 3 }}>
                                Done {new Date(c.completedAt).toLocaleString()}
                                {(c.actualWeight || c.actualReps) &&
                                  ` · logged ${[c.actualReps && `${c.actualReps} reps`, c.actualWeight].filter(Boolean).join(" @ ")}`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
