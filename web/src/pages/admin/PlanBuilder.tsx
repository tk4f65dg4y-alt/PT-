import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import ExercisePicker, { LibraryItem } from "../../components/ExercisePicker";

interface ExerciseDraft {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  restSeconds: string;
  notes: string;
  libraryItemId: string | null;
}
interface DayDraft {
  label: string;
  exercises: ExerciseDraft[];
}
interface WeekDraft {
  label: string;
  days: DayDraft[];
}

function emptyExercise(): ExerciseDraft {
  return { name: "", sets: "3", reps: "10", weight: "", restSeconds: "60", notes: "", libraryItemId: null };
}
function emptyDay(index: number): DayDraft {
  return { label: `Day ${index + 1}`, exercises: [emptyExercise()] };
}
function emptyWeek(index: number): WeekDraft {
  return { label: `Week ${index + 1}`, days: [emptyDay(0)] };
}

export default function PlanBuilder() {
  const { groupId, planId } = useParams();
  const editing = Boolean(planId);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [weeks, setWeeks] = useState<WeekDraft[]>([emptyWeek(0)]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [groupIdForSave, setGroupIdForSave] = useState(groupId);

  useEffect(() => {
    api.get("/library").then(setLibrary).catch(() => {});
  }, []);

  useEffect(() => {
    if (!planId) return;
    api
      .get(`/admin/plans/${planId}`)
      .then((plan) => {
        setTitle(plan.title);
        setNotes(plan.notes || "");
        setStartDate(plan.startDate ? plan.startDate.slice(0, 10) : "");
        setExpiresAt(plan.expiresAt ? plan.expiresAt.slice(0, 10) : "");
        setPriceLabel(plan.priceLabel || "");
        setGroupIdForSave(plan.group.id);
        setWeeks(
          plan.weeks.map((w: any) => ({
            label: w.label,
            days: w.days.map((d: any) => ({
              label: d.label,
              exercises: d.exercises.map((e: any) => ({
                name: e.name,
                sets: e.sets != null ? String(e.sets) : "",
                reps: e.reps || "",
                weight: e.weight || "",
                restSeconds: e.restSeconds != null ? String(e.restSeconds) : "",
                notes: e.notes || "",
                libraryItemId: e.libraryItemId,
              })),
            })),
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [planId]);

  function updateWeek(wi: number, patch: Partial<WeekDraft>) {
    setWeeks((ws) => ws.map((w, i) => (i === wi ? { ...w, ...patch } : w)));
  }
  function updateDay(wi: number, di: number, patch: Partial<DayDraft>) {
    setWeeks((ws) =>
      ws.map((w, i) =>
        i !== wi ? w : { ...w, days: w.days.map((d, j) => (j === di ? { ...d, ...patch } : d)) }
      )
    );
  }
  function updateExercise(wi: number, di: number, ei: number, patch: Partial<ExerciseDraft>) {
    setWeeks((ws) =>
      ws.map((w, i) =>
        i !== wi
          ? w
          : {
              ...w,
              days: w.days.map((d, j) =>
                j !== di
                  ? d
                  : { ...d, exercises: d.exercises.map((e, k) => (k === ei ? { ...e, ...patch } : e)) }
              ),
            }
      )
    );
  }

  function addWeek() {
    setWeeks((ws) => [...ws, emptyWeek(ws.length)]);
  }
  function removeWeek(wi: number) {
    setWeeks((ws) => ws.filter((_, i) => i !== wi));
  }
  function duplicateWeek(wi: number) {
    setWeeks((ws) => {
      const copy = JSON.parse(JSON.stringify(ws[wi])) as WeekDraft;
      copy.label = `Week ${ws.length + 1}`;
      return [...ws, copy];
    });
  }
  function addDay(wi: number) {
    setWeeks((ws) => ws.map((w, i) => (i !== wi ? w : { ...w, days: [...w.days, emptyDay(w.days.length)] })));
  }
  function removeDay(wi: number, di: number) {
    setWeeks((ws) =>
      ws.map((w, i) => (i !== wi ? w : { ...w, days: w.days.filter((_, j) => j !== di) }))
    );
  }
  function addExercise(wi: number, di: number) {
    setWeeks((ws) =>
      ws.map((w, i) =>
        i !== wi
          ? w
          : {
              ...w,
              days: w.days.map((d, j) => (j !== di ? d : { ...d, exercises: [...d.exercises, emptyExercise()] })),
            }
      )
    );
  }
  function removeExercise(wi: number, di: number, ei: number) {
    setWeeks((ws) =>
      ws.map((w, i) =>
        i !== wi
          ? w
          : {
              ...w,
              days: w.days.map((d, j) =>
                j !== di ? d : { ...d, exercises: d.exercises.filter((_, k) => k !== ei) }
              ),
            }
      )
    );
  }

  async function submit() {
    setError("");
    if (!title.trim()) {
      setError("Give the plan a title");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title,
        notes,
        startDate: startDate || null,
        expiresAt: expiresAt || null,
        priceLabel: priceLabel || null,
        weeks: weeks.map((w) => ({
          label: w.label,
          days: w.days.map((d) => ({
            label: d.label,
            exercises: d.exercises
              .filter((e) => e.name.trim())
              .map((e) => ({
                name: e.name,
                sets: e.sets ? Number(e.sets) : null,
                reps: e.reps || null,
                weight: e.weight || null,
                restSeconds: e.restSeconds ? Number(e.restSeconds) : null,
                notes: e.notes || null,
                libraryItemId: e.libraryItemId,
              })),
          })),
        })),
      };
      const plan = editing
        ? await api.put(`/admin/plans/${planId}`, payload)
        : await api.post(`/admin/groups/${groupIdForSave}/plans`, payload);
      navigate(`/admin/plans/${plan.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="empty">Loading…</div>;

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate(-1)} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>{editing ? "Edit plan" : "New plan"}</h1>
        </div>
      </div>
      <div className="content">
        {error && <div className="error-box">{error}</div>}
        {editing && (
          <div className="info-box">
            Saving changes here replaces this plan's exercises — any progress already logged against them will be
            cleared.
          </div>
        )}
        <div className="card">
          <div className="field">
            <label>Plan title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 8-Week Strength Block" />
          </div>
          <div className="row">
            <div className="field">
              <label>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Expires</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Price (optional)</label>
            <input
              value={priceLabel}
              onChange={(e) => setPriceLabel(e.target.value)}
              placeholder="e.g. £120 / 8 weeks"
            />
          </div>
          <div className="field">
            <label>Notes for client (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {weeks.map((week, wi) => (
          <div className="card" key={wi}>
            <div className="list-row" style={{ marginBottom: 10 }}>
              <input
                style={{
                  background: "transparent",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 16,
                  padding: 0,
                  width: "70%",
                }}
                value={week.label}
                onChange={(e) => updateWeek(wi, { label: e.target.value })}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn ghost sm" onClick={() => duplicateWeek(wi)} title="Duplicate week">
                  Duplicate
                </button>
                {weeks.length > 1 && (
                  <button className="btn ghost sm" onClick={() => removeWeek(wi)} style={{ color: "var(--danger)" }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {week.days.map((day, di) => (
              <div key={di} style={{ background: "var(--bg-elev-2)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div className="list-row" style={{ marginBottom: 8 }}>
                  <input
                    style={{
                      background: "transparent",
                      border: "none",
                      fontWeight: 700,
                      padding: 0,
                    }}
                    value={day.label}
                    onChange={(e) => updateDay(wi, di, { label: e.target.value })}
                  />
                  {week.days.length > 1 && (
                    <button className="icon-btn" onClick={() => removeDay(wi, di)} title="Remove day">
                      ✕
                    </button>
                  )}
                </div>

                {day.exercises.map((ex, ei) => (
                  <div key={ei} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                    <div className="row">
                      <div className="field" style={{ marginBottom: 6 }}>
                        <ExercisePicker
                          items={library}
                          value={ex.name}
                          onChange={(name) => updateExercise(wi, di, ei, { name, libraryItemId: null })}
                          onPick={(item) =>
                            updateExercise(wi, di, ei, {
                              name: item.name,
                              libraryItemId: item.id,
                              sets: item.defaultSets != null ? String(item.defaultSets) : ex.sets,
                              reps: item.defaultReps || ex.reps,
                              restSeconds: item.defaultRest != null ? String(item.defaultRest) : ex.restSeconds,
                            })
                          }
                        />
                      </div>
                      <button className="icon-btn" onClick={() => removeExercise(wi, di, ei)} title="Remove exercise">
                        ✕
                      </button>
                    </div>
                    <div className="row">
                      <div className="field" style={{ marginBottom: 0 }}>
                        <input
                          placeholder="Sets"
                          type="number"
                          value={ex.sets}
                          onChange={(e) => updateExercise(wi, di, ei, { sets: e.target.value })}
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <input
                          placeholder="Reps"
                          value={ex.reps}
                          onChange={(e) => updateExercise(wi, di, ei, { reps: e.target.value })}
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <input
                          placeholder="Weight"
                          value={ex.weight}
                          onChange={(e) => updateExercise(wi, di, ei, { weight: e.target.value })}
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <input
                          placeholder="Rest (s)"
                          type="number"
                          value={ex.restSeconds}
                          onChange={(e) => updateExercise(wi, di, ei, { restSeconds: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="btn secondary sm" onClick={() => addExercise(wi, di)}>
                  + Exercise
                </button>
              </div>
            ))}
            <button className="btn secondary sm" onClick={() => addDay(wi)}>
              + Day
            </button>
          </div>
        ))}

        <button className="btn secondary block" onClick={addWeek}>
          + Add week
        </button>

        <div style={{ height: 12 }} />
        <button className="btn block" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Save & assign plan"}
        </button>
      </div>
    </div>
  );
}
