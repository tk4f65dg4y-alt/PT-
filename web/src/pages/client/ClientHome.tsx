import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import Logo from "../../components/Logo";
import StreakBadges, { ClientStats } from "../../components/StreakBadges";
import EnableNotifications from "../../components/EnableNotifications";
import ClientTabBar from "../../components/ClientTabBar";

interface Plan {
  id: string;
  title: string;
  notes: string | null;
  startDate: string | null;
  archived: boolean;
  createdAt: string;
}

export default function ClientHome() {
  const { user, logout } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/client/plans").then(setPlans).catch((e) => setError(e.message));
    api.get("/client/stats").then(setStats).catch(() => {});
  }, []);

  const active = (plans || []).filter((p) => !p.archived);
  const archived = (plans || []).filter((p) => p.archived);

  return (
    <div className="app-shell with-tabbar">
      <div className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <h1>Hey {user?.name?.split(" ")[0]} 👋</h1>
            <div className="sub">Your training plans</div>
          </div>
        </div>
        <button className="btn ghost" onClick={() => logout()}>
          Log out
        </button>
      </div>
      <div className="content">
        {error && <div className="error-box">{error}</div>}
        <EnableNotifications />
        {stats && <StreakBadges stats={stats} />}

        {plans === null ? (
          <div className="empty">Loading…</div>
        ) : active.length === 0 ? (
          <div className="empty">No plan assigned yet — check back soon!</div>
        ) : (
          active.map((p) => (
            <Link key={p.id} to={`/plans/${p.id}`} className="card tap" style={{ display: "block" }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{p.title}</div>
              {p.startDate && (
                <div className="small muted">Started {new Date(p.startDate).toLocaleDateString()}</div>
              )}
              {p.notes && <div className="small" style={{ marginTop: 6 }}>{p.notes}</div>}
            </Link>
          ))
        )}

        {archived.length > 0 && (
          <>
            <h3 className="muted small">Past plans</h3>
            {archived.map((p) => (
              <Link key={p.id} to={`/plans/${p.id}`} className="card tap" style={{ display: "block", opacity: 0.7 }}>
                <div style={{ fontWeight: 700 }}>{p.title}</div>
              </Link>
            ))}
          </>
        )}
      </div>
      <ClientTabBar />
    </div>
  );
}
