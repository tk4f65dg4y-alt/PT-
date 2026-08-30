import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";

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
  members: { id: string; name: string; email: string }[];
  plans: Plan[];
}

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/admin/groups/${id}`).then(setGroup).catch((e) => setError(e.message));
  }, [id]);

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate("/admin")} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>{group ? group.members.map((m) => m.name).join(" & ") : "…"}</h1>
        </div>
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

            <button className="btn block" onClick={() => navigate(`/admin/groups/${group.id}/plans/new`)}>
              + Upload new plan
            </button>

            <h3>Plans</h3>
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
      </div>
    </div>
  );
}
