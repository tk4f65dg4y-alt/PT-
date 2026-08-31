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
  expiresAt: string | null;
  priceLabel: string | null;
  archived: boolean;
  createdAt: string;
}

function expiryInfo(expiresAt: string | null) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: "Expired", cls: "warn" };
  if (days === 0) return { text: "Expires today", cls: "warn" };
  if (days <= 7) return { text: `Expires in ${days}d`, cls: "warn" };
  return { text: `Expires ${new Date(expiresAt).toLocaleDateString()}`, cls: "" };
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
            <div className="sub">Casey Bond Personal Training</div>
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
          active.map((p) => {
            const expiry = expiryInfo(p.expiresAt);
            return (
              <Link key={p.id} to={`/plans/${p.id}`} className="card tap" style={{ display: "block" }}>
                <div className="list-row">
                  <div style={{ fontWeight: 800, fontSize: 17 }}>{p.title}</div>
                  {expiry && <span className={`badge ${expiry.cls}`}>{expiry.text}</span>}
                </div>
                {p.startDate && (
                  <div className="small muted">Started {new Date(p.startDate).toLocaleDateString()}</div>
                )}
                {p.priceLabel && <div className="small muted">{p.priceLabel}</div>}
                {p.notes && <div className="small" style={{ marginTop: 6 }}>{p.notes}</div>}
              </Link>
            );
          })
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
