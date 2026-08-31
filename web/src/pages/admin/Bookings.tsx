import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

interface Booking {
  id: string;
  startTime: string;
  status: "REQUESTED" | "CONFIRMED" | "DECLINED" | "CANCELLED";
  clientNote: string | null;
  trainerNote: string | null;
  requestedBy: { id: string; name: string };
  group: { id: string; name: string };
}

const STATUS_BADGE: Record<Booking["status"], { text: string; cls: string }> = {
  REQUESTED: { text: "Pending", cls: "warn" },
  CONFIRMED: { text: "Confirmed", cls: "good" },
  DECLINED: { text: "Declined", cls: "" },
  CANCELLED: { text: "Cancelled", cls: "" },
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");

  function load() {
    api.get("/admin/bookings").then(setBookings).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function respond(id: string, status: "CONFIRMED" | "DECLINED") {
    await api.post(`/admin/bookings/${id}/respond`, { status });
    load();
  }

  const pending = (bookings || []).filter((b) => b.status === "REQUESTED");
  const rest = (bookings || []).filter((b) => b.status !== "REQUESTED");

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate("/admin")} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>Session bookings</h1>
        </div>
      </div>
      <div className="content">
        {error && <div className="error-box">{error}</div>}

        <h3 className="muted small">Pending requests</h3>
        {bookings === null ? (
          <div className="empty">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="empty">No pending requests.</div>
        ) : (
          pending.map((b) => (
            <div className="card" key={b.id}>
              <div className="list-row">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    <Link to={`/admin/groups/${b.group.id}`}>{b.requestedBy.name}</Link>
                  </div>
                  <div className="small muted">
                    {new Date(b.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  {b.clientNote && <div className="small" style={{ marginTop: 4 }}>{b.clientNote}</div>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn sm" onClick={() => respond(b.id, "CONFIRMED")}>
                    Confirm
                  </button>
                  <button className="btn danger sm" onClick={() => respond(b.id, "DECLINED")}>
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {rest.length > 0 && (
          <>
            <h3 className="muted small">History</h3>
            {rest.map((b) => (
              <div className="card" key={b.id} style={{ opacity: 0.75 }}>
                <div className="list-row">
                  <div>
                    <div style={{ fontWeight: 700 }}>{b.requestedBy.name}</div>
                    <div className="small muted">
                      {new Date(b.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[b.status].cls}`}>{STATUS_BADGE[b.status].text}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
