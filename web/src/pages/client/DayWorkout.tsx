import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import RestTimer from "../../components/RestTimer";
import MovementAnimation, { MovementPattern } from "../../components/MovementAnimation";
import CheckInModal from "../../components/CheckInModal";
import { celebrateComplete } from "../../lib/confetti";
import { loadSession, saveSession, clearSession, LocalSession } from "../../lib/session";

interface Completion {
  id: string;
}
interface Exercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  completions: Completion[];
  libraryItem: { pattern: MovementPattern; cue: string; muscles: string } | null;
}
interface Day {
  id: string;
  label: string;
  exercises: Exercise[];
}
interface Week {
  id: string;
  days: Day[];
}
interface PlanData {
  id: string;
  title: string;
  weeks: Week[];
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function DayWorkout() {
  const { id: planId, dayId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [error, setError] = useState("");
  const [openTimerFor, setOpenTimerFor] = useState<string | null>(null);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busyExercise, setBusyExercise] = useState<string | null>(null);
  const [checkInFor, setCheckInFor] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/client/plans/${planId}`).then(setPlan).catch((e) => setError(e.message));
  }, [planId]);

  useEffect(() => {
    if (!dayId) return;
    setSession(loadSession(dayId));
  }, [dayId]);

  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

  const day = useMemo(() => {
    for (const w of plan?.weeks || []) {
      const d = w.days.find((d) => d.id === dayId);
      if (d) return d;
    }
    return null;
  }, [plan, dayId]);

  async function startWorkout() {
    if (!dayId) return;
    const s = await api.post(`/client/days/${dayId}/sessions/start`);
    const rec = { id: s.id, startedAt: Date.parse(s.startedAt) };
    saveSession(dayId, rec);
    setSession(rec);
  }

  async function finishWorkout() {
    if (!session || !dayId) return;
    await api.post(`/client/sessions/${session.id}/finish`);
    clearSession(dayId);
    setCheckInFor(session.id);
    setSession(null);
  }

  async function toggleExercise(ex: Exercise) {
    setBusyExercise(ex.id);
    const nowDone = ex.completions.length > 0;
    try {
      await api.post(`/client/exercises/${ex.id}/complete`, {
        completed: !nowDone,
        actualReps: ex.reps,
        actualWeight: ex.weight,
      });
      setPlan((p) => {
        if (!p) return p;
        return {
          ...p,
          weeks: p.weeks.map((w) => ({
            ...w,
            days: w.days.map((d) =>
              d.id !== dayId
                ? d
                : {
                    ...d,
                    exercises: d.exercises.map((e) =>
                      e.id === ex.id ? { ...e, completions: nowDone ? [] : [{ id: "local" }] } : e
                    ),
                  }
            ),
          })),
        };
      });
      if (!nowDone && day) {
        const willAllBeDone = day.exercises.every((e) => (e.id === ex.id ? true : e.completions.length > 0));
        if (willAllBeDone) celebrateComplete();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyExercise(null);
    }
  }

  if (error) return <div className="content"><div className="error-box">{error}</div></div>;
  if (!plan || !day) return <div className="empty">Loading…</div>;

  if (checkInFor) {
    return (
      <CheckInModal
        sessionId={checkInFor}
        dayLabel={day.label}
        onDone={() => setCheckInFor(null)}
      />
    );
  }

  const done = day.exercises.filter((e) => e.completions.length > 0).length;
  const total = day.exercises.length;
  const elapsed = session ? Math.max(0, Math.floor((now - session.startedAt) / 1000)) : 0;

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate(`/plans/${planId}`)} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>{day.label}</h1>
        </div>
        <span className="badge">
          {done}/{total} done
        </span>
      </div>
      <div className="content">
        {!session && (
          <button
            className="btn block"
            onClick={() => navigate(`/plans/${planId}/days/${dayId}/guided`)}
            style={{ marginBottom: 10 }}
          >
            ▶ Start guided session
          </button>
        )}
        <div className="card" style={{ textAlign: "center" }}>
          {!session ? (
            <button className="btn secondary block" onClick={startWorkout}>
              Start here instead (list view)
            </button>
          ) : (
            <>
              <div className="muted small">Workout in progress</div>
              <div className="timer-display">{formatElapsed(elapsed)}</div>
              <button className="btn danger block" onClick={finishWorkout}>
                ■ Finish workout
              </button>
            </>
          )}
        </div>

        {day.exercises.map((ex) => {
          const isDone = ex.completions.length > 0;
          return (
            <div className="card" key={ex.id}>
              <div className="exercise-row" style={{ paddingTop: 0 }}>
                <div
                  className={`checkbox ${isDone ? "checked" : ""}`}
                  onClick={() => toggleExercise(ex)}
                  style={{ opacity: busyExercise === ex.id ? 0.5 : 1 }}
                >
                  {isDone ? "✓" : ""}
                </div>
                {ex.libraryItem && <MovementAnimation pattern={ex.libraryItem.pattern} size={40} />}
                <div style={{ flex: 1 }}>
                  <div className={`exercise-name ${isDone ? "done" : ""}`}>{ex.name}</div>
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
                  {ex.notes && <div className="small muted" style={{ marginTop: 3 }}>{ex.notes}</div>}
                </div>
                <button
                  className="icon-btn"
                  onClick={() => setOpenTimerFor(openTimerFor === ex.id ? null : ex.id)}
                  title="Rest timer"
                >
                  ⏱
                </button>
              </div>
              {openTimerFor === ex.id && <RestTimer defaultSeconds={ex.restSeconds || 60} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
