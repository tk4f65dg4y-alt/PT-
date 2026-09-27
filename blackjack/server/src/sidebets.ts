import { Card, Rank, SideBetSettled } from "./types";

const RED_SUITS = new Set(["H", "D"]);

function rankOrder(r: Rank): number {
  if (r === "A") return 14;
  if (r === "K") return 13;
  if (r === "Q") return 12;
  if (r === "J") return 11;
  return parseInt(r, 10);
}

/** Perfect Pairs: bet resolves on the player's first two cards alone. */
export function settlePerfectPairs(cards: [Card, Card], bet: number): SideBetSettled {
  const [a, b] = cards;
  if (a.rank !== b.rank) return { result: "lose", payout: 0 };
  if (a.suit === b.suit) return { result: "perfectPair", payout: bet * 31 };
  if (RED_SUITS.has(a.suit) === RED_SUITS.has(b.suit)) return { result: "coloredPair", payout: bet * 11 };
  return { result: "mixedPair", payout: bet * 6 };
}

/** 21+3: the player's first two cards plus the dealer's up card, scored as a 3-card poker hand. */
export function settleTwentyOnePlusThree(playerCards: [Card, Card], dealerUp: Card, bet: number): SideBetSettled {
  const cards = [...playerCards, dealerUp];
  const ranks = cards.map((c) => rankOrder(c.rank)).sort((x, y) => x - y);
  const isFlush = new Set(cards.map((c) => c.suit)).size === 1;
  const isTrips = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isSequential = !isTrips && ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
  const isLowAceStraight = !isTrips && ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14;
  const isStraight = isSequential || isLowAceStraight;
  const isStraightFlush = isStraight && isFlush;
  const isSuitedTrips = isTrips && isFlush;

  if (isSuitedTrips) return { result: "suitedTrips", payout: bet * 101 };
  if (isStraightFlush) return { result: "straightFlush", payout: bet * 41 };
  if (isTrips) return { result: "threeOfAKind", payout: bet * 31 };
  if (isStraight) return { result: "straight", payout: bet * 11 };
  if (isFlush) return { result: "flush", payout: bet * 6 };
  return { result: "lose", payout: 0 };
}
