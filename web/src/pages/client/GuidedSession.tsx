import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import RestTimer from "../../components/RestTimer";
import MovementAnimation, { MovementPattern } from "../../components/MovementAnimation";
import CheckInModal from "../../components/CheckInModal";
import { celebrateComplete } from "../../lib/confetti";
import { loadSession, saveSession, clearSession, LocalSession } from "../../lib/session";

interface Exercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  completions: { id: string }[];
  libraryItem: { pattern: MovementPattern; cue: string; muscles: string } | null;
}
interface Day {
  id: string;
  label: string;
  exercises: Exercise[];
}
interface Week {
  days: Day[];
}
interface PlanData {
  id: string;
  weeks: Week[];
}

export default function GuidedSession() {
  const { id: planId, dayId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    api.get(`/client/plans/${planId}`).then(setPlan).catch((e) => setError(e.message));
  }, [planId]);

  useEffect(() => {
    if (!dayId) return;
    (async () => {
      const existing = loadSession(dayId);
      if (existing) {
        setSession(existing);
        return;
      }
      try {
        const s = await api.post(`/client/days/${dayId}/sessions/start`);
        const rec = { id: s.id, startedAt: Date.parse(s.startedAt) };
        saveSession(dayId, rec);
        setSession(rec);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [dayId]);

  const day = useMemo(() => {
    for (const w of plan?.weeks || []) {
      const d = w.days.find((d) => d.id === dayId);
      if (d) return d;
    }
    return null;
  }, [plan, dayId]);

  const exercises = day?.exercises || [];
  const current = exercises[index];
  const done = exercises.filter((e) => e.completions.length > 0).length;

  async function toggleCurrent() {
    if (!current) return;
    setBusy(true);
    const nowDone = current.completions.length > 0;
    try {
      await api.post(`/client/exercises/${current.id}/complete`, {
        completed: !nowDone,
        actualReps: current.reps,
        actualWeight: current.weight,
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
                      e.id === current.id ? { ...e, completions: nowDone ? [] : [{ id: "local" }] } : e
                    ),
                  }
            ),
          })),
        };
      });
      if (!nowDone) {
        if (current.restSeconds) setShowRest(true);
        if (index === exercises.length - 1) {
          const willAllBeDone = exercises.every((e) => (e.id === current.id ? true : e.completions.length > 0));
          if (willAllBeDone) celebrateComplete();
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    setShowRest(false);
    if (index < exercises.length - 1) setIndex(index + 1);
  }
  function goPrev() {
    setShowRest(false);
    if (index > 0) setIndex(index - 1);
  }

  async function finishSession() {
    if (!session) return;
    setBusy(true);
    try {
      await api.post(`/client/sessions/${session.id}/finish`);
      if (dayId) clearSession(dayId);
      setFinished(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="content"><div className="error-box">{error}</div></div>;
  if (!plan || !day || !session) return <div className="empty">Loading…</div>;

  if (finished) {
    return (
      <CheckInModal
        sessionId={session.id}
        dayLabel={day.label}
        onDone={() => navigate("/", { replace: true })}
      />
    );
  }

  return (
    <div className="guided-shell">
      <div className="guided-top">
        <button className="icon-btn" onClick={() => navigate(`/plans/${planId}/days/${dayId}`)} title="Exit">
          ✕
        </button>
        <div className="guided-progress">
          <div className="guided-progress-text">
            {index + 1} / {exercises.length}
          </div>
          <div className="progress-bar">
            <div style={{ width: `${((index + 1) / exercises.length) * 100}%` }} />
          </div>
        </div>
        <div style={{ width: 32 }} />
      </div>

      <div className="guided-body">
        {current && (
          <>
            {current.libraryItem && <MovementAnimation pattern={current.libraryItem.pattern} size={96} />}
            <div className="guided-name">{current.name}</div>
            <div className="guided-meta">
              {[current.sets && `${current.sets} sets`, current.reps && `${current.reps} reps`, current.weight]
                .filter(Boolean)
                .join(" · ")}
            </div>
            {current.libraryItem?.muscles && <div className="badge accent">{current.libraryItem.muscles}</div>}
            {current.libraryItem?.cue && (
              <div className="guided-cue">
                <span className="cue-label">Technique </span>
                {current.libraryItem.cue}
              </div>
            )}
            {current.notes && <div className="guided-cue muted">{current.notes}</div>}

            {showRest && (
              <div className="card" style={{ marginTop: 18, width: "100%" }}>
                <RestTimer defaultSeconds={current.restSeconds || 60} />
              </div>
            )}

            <div
              className={`checkbox guided-check ${current.completions.length > 0 ? "checked" : ""}`}
              onClick={toggleCurrent}
              style={{ opacity: busy ? 0.5 : 1 }}
            >
              {current.completions.length > 0 ? "✓" : ""}
            </div>
            <div className="small muted">{current.completions.length > 0 ? "Marked done — tap to undo" : "Tap when done"}</div>
          </>
        )}
      </div>

      <div className="guided-nav">
        <button className="btn secondary" onClick={goPrev} disabled={index === 0}>
          ← Prev
        </button>
        {index < exercises.length - 1 ? (
          <button className="btn" onClick={goNext}>
            Next →
          </button>
        ) : (
          <button className="btn" onClick={finishSession} disabled={busy}>
            {busy ? "Finishing…" : "Finish session"}
          </button>
        )}
      </div>
      {index === exercises.length - 1 && (
        <div className="small muted" style={{ textAlign: "center", padding: "0 20px 16px" }}>
          {done}/{exercises.length} exercises done
        </div>
      )}
    </div>
  );
}
