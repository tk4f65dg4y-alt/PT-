import { useCountdown } from "../lib/useCountdown";

const CHIP_VALUES = [5, 25, 100, 500];

export function BetControls({
  currentBet,
  chips,
  minBet,
  maxBet,
  bettingDeadline,
  onBet,
}: {
  currentBet: number;
  chips: number;
  minBet: number;
  maxBet: number;
  bettingDeadline: number | null;
  onBet: (amount: number) => void;
}) {
  const secs = useCountdown(bettingDeadline);

  function addChip(v: number) {
    const next = Math.min(maxBet, chips, currentBet + v);
    onBet(next);
  }

  return (
    <div className="bet-controls">
      <div className="bet-status">
        <span>Your bet: {currentBet}</span>
        {secs !== null && <span className="bet-timer">{Math.ceil(secs)}s</span>}
      </div>
      <div className="chip-tray">
        {CHIP_VALUES.map((v) => (
          <button
            key={v}
            className={`chip chip-btn ${v === 5 ? "chip-red" : v === 25 ? "chip-green" : v === 100 ? "chip-black" : "chip-purple"}`}
            onClick={() => addChip(v)}
            disabled={currentBet + v > maxBet || currentBet + v > chips}
          >
            {v}
          </button>
        ))}
        <button className="btn btn-clear" onClick={() => onBet(0)} disabled={currentBet === 0}>
          Clear
        </button>
      </div>
      <div className="bet-limits">
        Table limits {minBet}–{maxBet}
      </div>
    </div>
  );
}
