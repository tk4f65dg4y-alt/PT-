import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, roomExists } from "../lib/api";

const NAME_KEY = "bj_name";

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function saveName(n: string) {
    setName(n);
    localStorage.setItem(NAME_KEY, n);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const code = await createRoom();
      navigate(`/t/${code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Enter a table code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const exists = await roomExists(code);
      if (!exists) {
        setError("No table with that code.");
        return;
      }
      navigate(`/t/${code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="home">
      <div className="home-card">
        <h1 className="home-title">
          <span className="suit red">♥</span>Blackjack<span className="suit">♠</span>
        </h1>
        <p className="home-sub">A live 4-deck table for up to 7 players. Pick a seat and play.</p>

        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(e) => saveName(e.target.value)}
            maxLength={24}
            placeholder="e.g. Sam"
            autoFocus
          />
        </label>

        <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
          Create a new table
        </button>

        <div className="divider">or join a table</div>

        <form onSubmit={handleJoin} className="join-form">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="TABLE CODE"
            maxLength={5}
            className="code-input"
          />
          <button className="btn" type="submit" disabled={busy}>
            Join
          </button>
        </form>

        {error && <div className="home-error">{error}</div>}
      </div>
    </div>
  );
}
