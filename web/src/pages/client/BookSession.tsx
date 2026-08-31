import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import ClientTabBar from "../../components/ClientTabBar";

interface Booking {
  id: string;
  startTime: string;
  status: "REQUESTED" | "CONFIRMED" | "DECLINED" | "CANCELLED";
  clientNote: string | null;
  trainerNote: string | null;
  requestedBy: { id: string; name: string };
}

const STATUS_BADGE: Record<Booking["status"], { text: string; cls: string }> = {
  REQUESTED: { text: "Pending", cls: "warn" },
  CONFIRMED: { text: "Confirmed", cls: "good" },
  DECLINED: { text: "Declined", cls: "" },
  CANCELLED: { text: "Cancelled", cls: "" },
};

export default function BookSession() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.get("/client/bookings").then(setBookings).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!date || !time) {
      setError("Pick a date and time");
      return;
    }
    setBusy(true);
    try {
      await api.post("/client/bookings", { startTime: new Date(`${date}T${time}`).toISOString(), clientNote: note });
      setDate("");
      setTime("");
      setNote("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    await api.post(`/client/bookings/${id}/cancel`);
    load();
  }

  const upcoming = (bookings || []).filter((b) => b.status === "REQUESTED" || b.status === "CONFIRMED");
  const past = (bookings || []).filter((b) => b.status === "DECLINED" || b.status === "CANCELLED");

  return (
    <div className="app-shell with-tabbar">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate("/")} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>Book a 1:1 session</h1>
        </div>
      </div>
      <div className="content">
        {error && <div className="error-box">{error}</div>}

        <form className="card" onSubmit={submit}>
          <h3 style={{ marginTop: 0 }}>Request a time</h3>
          <div className="row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <label>Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What would you like to work on?" />
          </div>
          <button className="btn block" disabled={busy}>
            {busy ? "Sending…" : "Request session"}
          </button>
        </form>

        <h3 className="muted small">Upcoming</h3>
        {bookings === null ? (
          <div className="empty">Loading…</div>
        ) : upcoming.length === 0 ? (
          <div className="empty">No sessions booked yet.</div>
        ) : (
          upcoming.map((b) => {
            const badge = STATUS_BADGE[b.status];
            return (
              <div className="card" key={b.id}>
                <div className="list-row">
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {new Date(b.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                    {b.clientNote && <div className="small muted">{b.clientNote}</div>}
                    {b.trainerNote && <div className="small muted">Trainer: {b.trainerNote}</div>}
                  </div>
                  <span className={`badge ${badge.cls}`}>{badge.text}</span>
                </div>
                {b.status !== "CANCELLED" && (
                  <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => cancel(b.id)}>
                    Cancel
                  </button>
                )}
              </div>
            );
          })
        )}

        {past.length > 0 && (
          <>
            <h3 className="muted small">Past</h3>
            {past.map((b) => (
              <div className="card" key={b.id} style={{ opacity: 0.6 }}>
                <div className="list-row">
                  <div style={{ fontWeight: 700 }}>
                    {new Date(b.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  <span className={`badge ${STATUS_BADGE[b.status].cls}`}>{STATUS_BADGE[b.status].text}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <ClientTabBar />
    </div>
  );
}
