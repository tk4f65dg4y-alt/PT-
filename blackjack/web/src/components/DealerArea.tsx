import { DealerPublic } from "../types";
import { PlayingCard } from "./PlayingCard";
import { ShoeStack } from "./ShoeStack";

export function DealerArea({
  dealer,
  shoeRemaining,
  shoeSize,
  code,
  onCustomize,
}: {
  dealer: DealerPublic;
  shoeRemaining: number;
  shoeSize: number;
  code: string;
  onCustomize: () => void;
}) {
  const photoUrl = dealer.photoVersion > 0 ? `/api/rooms/${code}/dealer-photo?v=${dealer.photoVersion}` : null;

  return (
    <div className="dealer-area">
      <div className="dealer-persona">
        <button
          className="dealer-avatar"
          onClick={onCustomize}
          style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
          title="Set the dealer's photo"
        >
          {!photoUrl && <span className="dealer-avatar-glyph">♠</span>}
        </button>
        <div className="dealer-nameplate">{dealer.name}</div>
      </div>

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
          <span
            className="hand-total dealer-total"
            style={{ marginLeft: (dealer.cards.length + (dealer.holeHidden ? 1 : 0)) * 24 + 6 }}
          >
            {dealer.holeHidden ? "?" : dealer.total}
          </span>
        )}
      </div>

      <ShoeStack remaining={shoeRemaining} size={shoeSize} />
    </div>
  );
}
