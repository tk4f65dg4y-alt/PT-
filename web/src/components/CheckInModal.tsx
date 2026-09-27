import { useState } from "react";
import { api } from "../lib/api";

type Rating = "EASY" | "JUST_RIGHT" | "BRUTAL";

const RATINGS: { value: Rating; level: number; label: string }[] = [
  { value: "EASY", level: 1, label: "Easy" },
  { value: "JUST_RIGHT", level: 2, label: "Just right" },
  { value: "BRUTAL", level: 3, label: "Brutal" },
];

export default function CheckInModal({
  sessionId,
  dayLabel,
  onDone,
}: {
  sessionId: string;
  dayLabel: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!rating) {
      setError("Pick how it felt");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/client/sessions/${sessionId}/checkin`, { rating, note: note.trim() || undefined });
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkin-overlay">
      <div className="checkin-sheet">
        <div className="checkin-kicker">Session complete</div>
        <h2 className="checkin-title">How did "{dayLabel}" feel?</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="checkin-ratings">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              className={`checkin-rating ${rating === r.value ? "selected" : ""}`}
              onClick={() => setRating(r.value)}
            >
              <span className="checkin-rating-dots">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`dot-fill ${n <= r.level ? "on" : ""}`} />
                ))}
              </span>
              {r.label}
            </button>
          ))}
        </div>
        <div className="field">
          <label>Anything to tell Casey? (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Struggled with something? Ask a question here — it goes straight to Casey."
          />
        </div>
        <button className="btn block" onClick={submit} disabled={busy}>
          {busy ? "Sending…" : "Done"}
        </button>
        <button className="checkin-skip" onClick={onDone} disabled={busy}>
          Skip
        </button>
      </div>
    </div>
  );
}
