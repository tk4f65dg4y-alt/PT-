import { Card } from "../types";

const SUIT_SYMBOL: Record<Card["suit"], string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RED_SUITS = new Set(["H", "D"]);

export function PlayingCard({ card, faceDown, small }: { card?: Card; faceDown?: boolean; small?: boolean }) {
  if (faceDown || !card) {
    return <div className={`card card-back ${small ? "card-sm" : ""}`} aria-label="face-down card" />;
  }
  const red = RED_SUITS.has(card.suit);
  return (
    <div className={`card ${red ? "card-red" : "card-black"} ${small ? "card-sm" : ""}`}>
      <span className="card-rank corner corner-tl">{card.rank}</span>
      <span className="card-suit-big">{SUIT_SYMBOL[card.suit]}</span>
      <span className="card-rank corner corner-br">{card.rank}</span>
    </div>
  );
}
