import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import StreakBadges, { ClientStats } from "../../components/StreakBadges";

interface Member {
  id: string;
  name: string;
  email: string;
  notes: string | null;
}
interface Plan {
  id: string;
  title: string;
  startDate: string | null;
  expiresAt: string | null;
  priceLabel: string | null;
  archived: boolean;
  createdAt: string;
}
interface GroupData {
  id: string;
  name: string;
  coachNote: string | null;
  coachNoteAt: string | null;
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
  const [tab, setTab] = useState<"plans" | "progress" | "formchecks" | "messages" | "notes">("plans");
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
            Nudge
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

            <CoachNoteEditor group={group} onSaved={(note, at) => setGroup({ ...group, coachNote: note, coachNoteAt: at })} />

            <div className="tabs">
              <div className={`tab ${tab === "plans" ? "active" : ""}`} onClick={() => setTab("plans")}>
                Plans
              </div>
              <div className={`tab ${tab === "progress" ? "active" : ""}`} onClick={() => setTab("progress")}>
                Progress
              </div>
              <div className={`tab ${tab === "formchecks" ? "active" : ""}`} onClick={() => setTab("formchecks")}>
                Form checks
              </div>
              <div className={`tab ${tab === "messages" ? "active" : ""}`} onClick={() => setTab("messages")}>
                Messages
              </div>
              <div className={`tab ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>
                Notes
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
                            {p.priceLabel && ` · ${p.priceLabel}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {p.expiresAt && (
                            <span className="badge">Expires {new Date(p.expiresAt).toLocaleDateString()}</span>
                          )}
                          {p.archived && <span className="badge">Archived</span>}
                        </div>
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
                {activeMember && <MemberCheckIns groupId={group.id} userId={activeMember} />}
              </>
            )}

            {tab === "formchecks" && (
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
                {activeMember && <MemberFormChecks groupId={group.id} userId={activeMember} />}
              </>
            )}

            {tab === "messages" && <GroupChat groupId={group.id} />}

            {tab === "notes" && (
              <>
                <div className="info-box">Private notes — only you see these, never the client.</div>
                {group.members.map((m) => (
                  <MemberNotes key={m.id} member={m} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MemberNotes({ member }: { member: Member }) {
  const [notes, setNotes] = useState(member.notes || "");
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.put(`/admin/clients/${member.id}/notes`, { notes });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="small muted" style={{ marginBottom: 6, fontWeight: 700 }}>
        {member.name}
      </div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Injuries, goals, preferences, anything worth remembering…"
        style={{ minHeight: 90 }}
      />
      <button className="btn secondary sm" style={{ marginTop: 8 }} onClick={save} disabled={busy || saved}>
        {busy ? "Saving…" : saved ? "Saved" : "Save note"}
      </button>
    </div>
  );
}

function CoachNoteEditor({
  group,
  onSaved,
}: {
  group: GroupData;
  onSaved: (note: string | null, at: string | null) => void;
}) {
  const [note, setNote] = useState(group.coachNote || "");
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await api.put(`/admin/groups/${group.id}/coach-note`, { note });
      onSaved(res.coachNote, res.coachNoteAt);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="small muted" style={{ marginBottom: 6, fontWeight: 700 }}>
        Note to client — shown on their home screen
      </div>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        placeholder="e.g. Great session last week — let's push the squats a little heavier today."
        style={{ minHeight: 70 }}
      />
      <button className="btn secondary sm" style={{ marginTop: 8 }} onClick={save} disabled={busy || saved}>
        {busy ? "Saving…" : saved ? "Saved" : "Save note"}
      </button>
    </div>
  );
}

const RATING_LABEL: Record<string, string> = { EASY: "Easy", JUST_RIGHT: "Just right", BRUTAL: "Brutal" };

function MemberCheckIns({ groupId, userId }: { groupId: string; userId: string }) {
  const [checkIns, setCheckIns] = useState<
    { id: string; rating: string; note: string | null; createdAt: string; session: { day: { label: string } } }[] | null
  >(null);

  useEffect(() => {
    setCheckIns(null);
    api.get(`/admin/groups/${groupId}/checkins/${userId}`).then(setCheckIns);
  }, [groupId, userId]);

  if (!checkIns) return null;
  if (checkIns.length === 0) return null;

  return (
    <div className="card">
      <div className="small muted" style={{ marginBottom: 8, fontWeight: 700 }}>
        How sessions have felt
      </div>
      {checkIns.map((c) => (
        <div key={c.id} className="list-row" style={{ marginBottom: 8, alignItems: "flex-start" }}>
          <div>
            <div className="small">{c.session.day.label}</div>
            {c.note && <div className="small muted">{c.note}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="small">{RATING_LABEL[c.rating] || c.rating}</div>
            <div className="small muted">{new Date(c.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface FormCheckComment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
}
interface FormCheckVideo {
  id: string;
  label: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  comments: FormCheckComment[];
}

function MemberFormChecks({ groupId, userId }: { groupId: string; userId: string }) {
  const [videos, setVideos] = useState<FormCheckVideo[] | null>(null);

  function load() {
    setVideos(null);
    api.get(`/admin/groups/${groupId}/form-checks/${userId}`).then(setVideos);
  }
  useEffect(load, [groupId, userId]);

  if (!videos) return <div className="empty">Loading…</div>;
  if (videos.length === 0) return <div className="empty">No form checks uploaded yet.</div>;

  return (
    <>
      {videos.map((v) => (
        <FormCheckReviewCard key={v.id} video={v} onCommented={load} />
      ))}
    </>
  );
}

function FormCheckReviewCard({ video, onCommented }: { video: FormCheckVideo; onCommented: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/form-checks/${video.id}/comments`, { body: reply.trim() });
      setReply("");
      onCommented();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="list-row" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{video.label}</div>
        <div className="small muted">{new Date(video.createdAt).toLocaleDateString()}</div>
      </div>
      <video controls playsInline style={{ width: "100%", borderRadius: "var(--radius-sm)", background: "#000" }}>
        <source src={`/api/admin/form-checks/${video.id}/file`} type={video.mimeType} />
      </video>
      {video.comments.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {video.comments.map((c) => (
            <div key={c.id} className="small" style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>{c.author.role === "TRAINER" ? "You" : c.author.name}: </span>
              {c.body}
            </div>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        <input
          placeholder="Leave feedback on this clip…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn secondary sm" onClick={send} disabled={busy || !reply.trim()}>
          Send
        </button>
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
