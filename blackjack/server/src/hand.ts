import { Card, Hand, Rank } from "./types";

function rankValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return parseInt(rank, 10);
}

export interface HandValue {
  total: number;
  soft: boolean; // true if an ace is currently counted as 11
}

export function valueOf(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += rankValue(c.rank);
    if (c.rank === "A") aces++;
  }
  let softAcesRemaining = aces;
  while (total > 21 && softAcesRemaining > 0) {
    total -= 10;
    softAcesRemaining--;
  }
  return { total, soft: softAcesRemaining > 0 };
}

export function isBust(cards: Card[]): boolean {
  return valueOf(cards).total > 21;
}

/** A "natural" blackjack: exactly two cards totaling 21, and not the result of a split. */
export function isNaturalBlackjack(hand: Pick<Hand, "cards" | "fromSplit">): boolean {
  return !hand.fromSplit && hand.cards.length === 2 && valueOf(hand.cards).total === 21;
}

export function canSplit(hand: Hand): boolean {
  if (hand.cards.length !== 2) return false;
  const [a, b] = hand.cards;
  const groupValue = (r: Rank) => (r === "J" || r === "Q" || r === "K" ? "10" : r);
  return groupValue(a.rank) === groupValue(b.rank);
}
