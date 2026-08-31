import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import StreakBadges, { ClientStats } from "../../components/StreakBadges";

interface Member {
  id: string;
  name: string;
  email: string;
}
interface Plan {
  id: string;
  title: string;
  startDate: string | null;
  archived: boolean;
  createdAt: string;
}
interface GroupData {
  id: string;
  name: string;
  members: Member[];
  plans: Plan[];
}
interface MessageRow {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"plans" | "progress" | "messages">("plans");
  const [activeMember, setActiveMember] = useState("");

  useEffect(() => {
    api
      .get(`/admin/groups/${id}`)
      .then((g) => {
        setGroup(g);
        setActiveMember(g.members[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function nudge() {
    if (!group) return;
    await api.post(`/admin/groups/${group.id}/nudge`, {});
    alert("Reminder sent!");
  }

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate("/admin")} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>{group ? group.members.map((m) => m.name).join(" & ") : "…"}</h1>
        </div>
        {group && (
          <button className="btn secondary sm" onClick={nudge}>
            🔔 Nudge
          </button>
        )}
      </div>
      <div className="content">
        {error && <div className="error-box">{error}</div>}
        {group && (
          <>
            <div className="card">
              <div className="small muted" style={{ marginBottom: 4 }}>
                Members
              </div>
              {group.members.map((m) => (
                <div key={m.id} className="small">
                  {m.name} · {m.email}
                </div>
              ))}
            </div>

            <div className="tabs">
              <div className={`tab ${tab === "plans" ? "active" : ""}`} onClick={() => setTab("plans")}>
                Plans
              </div>
              <div className={`tab ${tab === "progress" ? "active" : ""}`} onClick={() => setTab("progress")}>
                Progress
              </div>
              <div className={`tab ${tab === "messages" ? "active" : ""}`} onClick={() => setTab("messages")}>
                Messages
              </div>
            </div>

            {tab === "plans" && (
              <>
                <button className="btn block" onClick={() => navigate(`/admin/groups/${group.id}/plans/new`)}>
                  + Upload new plan
                </button>
                {group.plans.length === 0 ? (
                  <div className="empty">No plans yet.</div>
                ) : (
                  group.plans.map((p) => (
                    <Link key={p.id} to={`/admin/plans/${p.id}`} className="card tap" style={{ display: "block" }}>
                      <div className="list-row">
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.title}</div>
                          <div className="small muted">
                            {p.startDate ? `Starts ${new Date(p.startDate).toLocaleDateString()}` : "No start date"}
                          </div>
                        </div>
                        {p.archived && <span className="badge">Archived</span>}
                      </div>
                    </Link>
                  ))
                )}
              </>
            )}

            {tab === "progress" && (
              <>
                {group.members.length > 1 && (
                  <div className="tabs">
                    {group.members.map((m) => (
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
                {activeMember && <MemberStats groupId={group.id} userId={activeMember} />}
              </>
            )}

            {tab === "messages" && <GroupChat groupId={group.id} />}
          </>
        )}
      </div>
    </div>
  );
}

function MemberStats({ groupId, userId }: { groupId: string; userId: string }) {
  const [stats, setStats] = useState<ClientStats | null>(null);

  useEffect(() => {
    setStats(null);
    api.get(`/admin/groups/${groupId}/stats/${userId}`).then(setStats);
  }, [groupId, userId]);

  if (!stats) return <div className="empty">Loading…</div>;
  return <StreakBadges stats={stats} />;
}

function GroupChat({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    api.get(`/admin/groups/${groupId}/messages`).then(setMessages);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await api.post(`/admin/groups/${groupId}/messages`, { body: text.trim() });
      setMessages((m) => [...(m || []), msg]);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 360 }}>
      <div className="chat-scroll" style={{ flex: 1 }}>
        {messages === null ? (
          <div className="empty">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="empty">No messages yet.</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender.role === "TRAINER";
            return (
              <div key={m.id} className={`bubble ${mine ? "me" : "them"}`}>
                {!mine && <div className="who">{m.sender.name}</div>}
                <div>{m.body}</div>
                <div className="when">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-bar">
        <input
          placeholder="Reply…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn" onClick={send} disabled={sending || !text.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
