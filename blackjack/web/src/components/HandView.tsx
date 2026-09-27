import { Hand } from "../types";
import { ChipStack } from "./Chip";
import { PlayingCard } from "./PlayingCard";

function rankValue(rank: string): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K" || rank === "10") return 10;
  return parseInt(rank, 10);
}

function handTotal(hand: Hand): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of hand.cards) {
    total += rankValue(c.rank);
    if (c.rank === "A") aces++;
  }
  let soft = aces > 0;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
    soft = aces > 0;
  }
  return { total, soft };
}

const RESULT_LABEL: Record<string, string> = {
  win: "WIN",
  lose: "LOSE",
  push: "PUSH",
  blackjack: "BLACKJACK!",
  bust: "BUST",
  surrender: "SURRENDER",
};

export function HandView({ hand, isActive, compact }: { hand: Hand; isActive?: boolean; compact?: boolean }) {
  const { total, soft } = handTotal(hand);
  return (
    <div className={`hand ${isActive ? "hand-active" : ""}`}>
      <div className="hand-cards">
        {hand.cards.map((c, i) => (
          <div key={i} className="hand-card-pos" style={{ left: `${i * (compact ? 14 : 20) }px` }}>
            <PlayingCard card={c} small={compact} />
          </div>
        ))}
        {hand.cards.length > 0 && (
          <span className="hand-total" style={{ marginLeft: hand.cards.length * (compact ? 14 : 20) + 6 }}>
            {total}
            {soft && total <= 21 ? " (soft)" : ""}
          </span>
        )}
      </div>
      <div className="hand-footer">
        <ChipStack amount={hand.bet} />
        {hand.doubled && <span className="tag tag-double">DOUBLE</span>}
        {hand.result && (
          <span className={`tag result-${hand.result}`}>{RESULT_LABEL[hand.result] || hand.result}</span>
        )}
      </div>
    </div>
  );
}
