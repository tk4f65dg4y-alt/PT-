import { Hand } from "../types";
import { useCountdown } from "../lib/useCountdown";

function rankGroup(r: string) {
  return r === "J" || r === "Q" || r === "K" ? "10" : r;
}

export function ActionBar({
  hand,
  chips,
  handCount,
  turnDeadline,
  onAction,
}: {
  hand: Hand;
  chips: number;
  handCount: number;
  turnDeadline: number | null;
  onAction: (action: "hit" | "stand" | "double" | "split") => void;
}) {
  const secs = useCountdown(turnDeadline);
  const canDouble = hand.cards.length === 2 && !hand.isSplitAces && chips >= hand.bet;
  const canSplit =
    hand.cards.length === 2 &&
    !hand.isSplitAces &&
    handCount < 4 &&
    chips >= hand.bet &&
    rankGroup(hand.cards[0].rank) === rankGroup(hand.cards[1].rank);

  return (
    <div className="action-bar">
      {secs !== null && (
        <div className="turn-timer">
          <div className="turn-timer-fill" style={{ width: `${Math.min(100, (secs / 20) * 100)}%` }} />
        </div>
      )}
      <div className="action-buttons">
        <button className="btn btn-action btn-hit" onClick={() => onAction("hit")}>
          Hit
        </button>
        <button className="btn btn-action btn-stand" onClick={() => onAction("stand")}>
          Stand
        </button>
        <button className="btn btn-action btn-double" onClick={() => onAction("double")} disabled={!canDouble}>
          Double
        </button>
        <button className="btn btn-action btn-split" onClick={() => onAction("split")} disabled={!canSplit}>
          Split
        </button>
      </div>
    </div>
  );
}
