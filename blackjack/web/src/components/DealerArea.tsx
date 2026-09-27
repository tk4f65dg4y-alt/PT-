import { DealerPublic } from "../types";
import { PlayingCard } from "./PlayingCard";

export function DealerArea({ dealer, shoeRemaining, shoeSize }: { dealer: DealerPublic; shoeRemaining: number; shoeSize: number }) {
  const shoePct = Math.max(0, Math.min(100, Math.round((shoeRemaining / shoeSize) * 100)));
  return (
    <div className="dealer-area">
      <div className="dealer-cards">
        {dealer.cards.map((c, i) => (
          <div key={i} className="hand-card-pos" style={{ left: `${i * 24}px` }}>
            <PlayingCard card={c} />
          </div>
        ))}
        {dealer.holeHidden && dealer.cards.length > 0 && (
          <div className="hand-card-pos" style={{ left: `${dealer.cards.length * 24}px` }}>
            <PlayingCard faceDown />
          </div>
        )}
        {dealer.cards.length > 0 && (
          <span className="hand-total dealer-total" style={{ marginLeft: (dealer.cards.length + (dealer.holeHidden ? 1 : 0)) * 24 + 6 }}>
            {dealer.holeHidden ? "?" : dealer.total}
          </span>
        )}
      </div>
      <div className="shoe-indicator" title={`${shoeRemaining} of ${shoeSize} cards left in the shoe`}>
        <div className="shoe-bar">
          <div className="shoe-fill" style={{ width: `${shoePct}%` }} />
        </div>
        <span>Shoe {shoePct}%</span>
      </div>
    </div>
  );
}
