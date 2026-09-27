import { randomInt } from "crypto";
import { Card, DECK_COUNT, Rank, Suit } from "./types";

const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS: Suit[] = ["S", "H", "D", "C"];

function freshDecks(count: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < count; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
  }
  return cards;
}

// Fisher-Yates using a cryptographically secure RNG so shuffles aren't predictable.
function shuffle(cards: Card[]): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

export class Shoe {
  private cards: Card[] = [];
  private cursor = 0;
  readonly size: number;

  constructor(deckCount: number = DECK_COUNT) {
    this.size = deckCount * 52;
    this.reshuffle();
  }

  reshuffle(): void {
    this.cards = freshDecks(DECK_COUNT);
    shuffle(this.cards);
    this.cursor = 0;
  }

  get remaining(): number {
    return this.cards.length - this.cursor;
  }

  draw(): Card {
    if (this.cursor >= this.cards.length) {
      this.reshuffle();
    }
    return this.cards[this.cursor++];
  }
}
