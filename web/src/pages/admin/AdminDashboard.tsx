import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import Logo from "../../components/Logo";
import EnableNotifications from "../../components/EnableNotifications";

interface Member {
  id: string;
  name: string;
  email: string;
}
interface GroupSummary {
  id: string;
  name: string;
  isPair: boolean;
  members: Member[];
  currentPlan: { id: string; title: string; archived: boolean } | null;
  lastActivityAt: string | null;
}

function timeAgo(iso: string | null) {
  if (!iso) return "No activity yet";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [unreadByGroup, setUnreadByGroup] = useState<Record<string, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [showPair, setShowPair] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.get("/admin/groups").then(setGroups).catch((e) => setError(e.message));
    api.get("/admin/messages/unread-counts").then(setUnreadByGroup).catch(() => {});
  }

  useEffect(load, []);

  const allClients = (groups || []).flatMap((g) => g.members);

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <h1>PT Coach</h1>
            <div className="sub">Admin · {user?.name}</div>
          </div>
        </div>
        <button className="btn ghost" onClick={() => logout()}>
          Log out
        </button>
      </div>
      <div className="content">
        {error && <div className="error-box">{error}</div>}
        <EnableNotifications text="Get a push when a client messages you." />
        <div className="row" style={{ marginBottom: 16 }}>
          <button className="btn block" onClick={() => { setShowAdd((v) => !v); setShowPair(false); }}>
            + Add client
          </button>
          <button className="btn secondary block" onClick={() => { setShowPair((v) => !v); setShowAdd(false); }}>
            Pair clients
          </button>
        </div>

        {showAdd && (
          <AddClientForm
            onDone={() => {
              setShowAdd(false);
              load();
            }}
          />
        )}
        {showPair && (
          <PairClientsForm
            clients={allClients}
            onDone={() => {
              setShowPair(false);
              load();
            }}
          />
        )}

        {groups === null ? (
          <div className="empty">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="empty">No clients yet — add your first client above.</div>
        ) : (
          groups.map((g) => (
            <Link key={g.id} to={`/admin/groups/${g.id}`} className="card tap" style={{ display: "block" }}>
              <div className="list-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="avatar-stack">
                    {g.members.map((m) => (
                      <div className="avatar" key={m.id}>
                        {initials(m.name)}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {g.members.map((m) => m.name).join(" & ")}
                    </div>
                    <div className="small muted">
                      {g.currentPlan ? g.currentPlan.title : "No plan assigned"}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                    {unreadByGroup[g.id] > 0 && <span className="badge count">{unreadByGroup[g.id]}</span>}
                    {g.isPair && <span className="badge">Pair</span>}
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {timeAgo(g.lastActivityAt)}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function AddClientForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/admin/clients", { name, email, password });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>Add client</h3>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label>Temporary password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <button className="btn block" disabled={busy}>
        {busy ? "Adding…" : "Add client"}
      </button>
    </form>
  );
}

function PairClientsForm({ clients, onDone }: { clients: Member[]; onDone: () => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!a || !b || a === b) {
      setError("Pick two different clients");
      return;
    }
    setBusy(true);
    try {
      const clientA = clients.find((c) => c.id === a);
      const clientB = clients.find((c) => c.id === b);
      await api.post("/admin/groups", {
        name: name || `${clientA?.name} & ${clientB?.name}`,
        memberUserIds: [a, b],
      });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>Pair two clients</h3>
      <p className="small muted">They'll share the same plan, and each ticks off their own progress.</p>
      {error && <div className="error-box">{error}</div>}
      <div className="row">
        <div className="field">
          <label>Client 1</label>
          <select value={a} onChange={(e) => setA(e.target.value)} required>
            <option value="">Select…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Client 2</label>
          <select value={b} onChange={(e) => setB(e.target.value)} required>
            <option value="">Select…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Pair name (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah & Mike" />
      </div>
      <button className="btn block" disabled={busy}>
        {busy ? "Pairing…" : "Create pair"}
      </button>
    </form>
  );
}
