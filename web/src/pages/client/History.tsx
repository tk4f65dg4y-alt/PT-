import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import ClientTabBar from "../../components/ClientTabBar";

interface CompletionRow {
  id: string;
  completedAt: string;
  exercise: { name: string; day: { label: string; week: { label: string; plan: { title: string } } } };
}
interface SessionRow {
  id: string;
  startedAt: string;
  durationSeconds: number | null;
  day: { label: string; week: { label: string; plan: { title: string } } };
}
interface CommentRow {
  id: string;
  body: string;
  timestampSec: number | null;
  createdAt: string;
  author: { id: string; name: string; role: string };
}
interface VideoRow {
  id: string;
  label: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  comments: CommentRow[];
}

export default function History() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState<{ completions: CompletionRow[]; sessions: SessionRow[] } | null>(null);
  const [tab, setTab] = useState<"workouts" | "exercises" | "formchecks">(
    params.get("tab") === "formchecks" ? "formchecks" : "workouts"
  );

  useEffect(() => {
    api.get("/client/history").then(setData);
  }, []);

  return (
    <div className="app-shell with-tabbar">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate("/")} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>History</h1>
        </div>
      </div>
      <div className="content">
        <div className="tabs">
          <div className={`tab ${tab === "workouts" ? "active" : ""}`} onClick={() => setTab("workouts")}>
            Workouts
          </div>
          <div className={`tab ${tab === "exercises" ? "active" : ""}`} onClick={() => setTab("exercises")}>
            Exercises
          </div>
          <div className={`tab ${tab === "formchecks" ? "active" : ""}`} onClick={() => setTab("formchecks")}>
            Form checks
          </div>
        </div>

        {tab === "formchecks" ? (
          <FormChecks initialExerciseId={params.get("exerciseId")} initialLabel={params.get("label")} />
        ) : !data ? (
          <div className="empty">Loading…</div>
        ) : tab === "workouts" ? (
          data.sessions.length === 0 ? (
            <div className="empty">No workouts logged yet.</div>
          ) : (
            data.sessions.map((s) => (
              <div className="card" key={s.id}>
                <div className="list-row">
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.day.label}</div>
                    <div className="small muted">
                      {s.day.week.plan.title} · {s.day.week.label}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="small">{new Date(s.startedAt).toLocaleDateString()}</div>
                    {s.durationSeconds != null && (
                      <div className="small muted">
                        {Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : data.completions.length === 0 ? (
          <div className="empty">No exercises completed yet.</div>
        ) : (
          data.completions.map((c) => (
            <div className="card" key={c.id}>
              <div className="list-row">
                <div>
                  <div style={{ fontWeight: 700 }}>{c.exercise.name}</div>
                  <div className="small muted">
                    {c.exercise.day.week.plan.title} · {c.exercise.day.label}
                  </div>
                </div>
                <div className="small">{new Date(c.completedAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <ClientTabBar />
    </div>
  );
}

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FormChecks({ initialExerciseId, initialLabel }: { initialExerciseId: string | null; initialLabel: string | null }) {
  const [videos, setVideos] = useState<VideoRow[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState(initialLabel || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.get("/client/form-checks").then(setVideos).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function upload() {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      fd.append("label", label || "Form check");
      if (initialExerciseId) fd.append("exerciseId", initialExerciseId);
      const video = await api.upload("/client/form-checks", fd);
      setVideos((v) => [video, ...(v || [])]);
      setFile(null);
      setLabel("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <div className="small muted" style={{ marginBottom: 8, fontWeight: 700 }}>
          Upload a form check
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label>Which exercise? (optional)</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Barbell Squat" />
        </div>
        <div className="field">
          <input
            type="file"
            accept="video/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <button className="btn block" onClick={upload} disabled={!file || busy}>
          {busy ? "Uploading…" : "Upload for Casey to review"}
        </button>
        <div className="small muted" style={{ marginTop: 8 }}>
          Keep clips short (under 20 seconds works best) — max size 30MB.
        </div>
      </div>

      {videos === null ? (
        <div className="empty">Loading…</div>
      ) : videos.length === 0 ? (
        <div className="empty">No form checks uploaded yet.</div>
      ) : (
        videos.map((v) => <FormCheckCard key={v.id} video={v} onCommented={load} />)
      )}
    </div>
  );
}

function FormCheckCard({ video, onCommented }: { video: VideoRow; onCommented: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/client/form-checks/${video.id}/comments`, { body: reply.trim() });
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
        <div className="small muted">
          {new Date(video.createdAt).toLocaleDateString()} · {formatSize(video.sizeBytes)}
        </div>
      </div>
      <video controls playsInline style={{ width: "100%", borderRadius: "var(--radius-sm)", background: "#000" }}>
        <source src={`/api/client/form-checks/${video.id}/file`} type={video.mimeType} />
      </video>
      {video.comments.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {video.comments.map((c) => (
            <div key={c.id} className="small" style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>{c.author.role === "TRAINER" ? "Casey" : c.author.name}: </span>
              {c.body}
            </div>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        <input
          placeholder="Ask a question about this clip…"
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
