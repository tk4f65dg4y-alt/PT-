// Mirrors server/src/types.ts (kept in sync by hand — small, stable surface).

export const SEAT_COUNT = 7;

export type Suit = "S" | "H" | "D" | "C";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type HandResult = "win" | "lose" | "push" | "blackjack" | "bust" | "surrender";

export interface Hand {
  cards: Card[];
  bet: number;
  status: "active" | "stand" | "bust" | "blackjack";
  doubled: boolean;
  fromSplit: boolean;
  isSplitAces: boolean;
  result?: HandResult;
  payout?: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  seat: number;
  chips: number;
  connected: boolean;
  pendingBet: number;
  hands: Hand[];
  activeHandIndex: number;
  insuranceBet: number | null;
  insuranceDecided: boolean;
  sittingOut: boolean;
}

export type RoomPhase =
  | "waiting"
  | "betting"
  | "insurance"
  | "dealing"
  | "playerTurns"
  | "dealerTurn"
  | "payout";

export interface DealerPublic {
  cards: Card[];
  holeHidden: boolean;
  total: number | null;
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
}

export interface RoomStateMsg {
  type: "state";
  code: string;
  phase: RoomPhase;
  players: (PlayerPublic | null)[];
  dealer: DealerPublic;
  activeSeat: number | null;
  activeHandIndex: number | null;
  turnDeadline: number | null;
  bettingDeadline: number | null;
  insuranceDeadline: number | null;
  shoeRemaining: number;
  shoeSize: number;
  minBet: number;
  maxBet: number;
  log: string[];
  you: { id: string; seat: number | null } | null;
}

export interface WelcomeMsg {
  type: "welcome";
  playerId: string;
  token: string;
}

export interface ErrorMsg {
  type: "error";
  message: string;
}

export type ServerMsg = RoomStateMsg | WelcomeMsg | ErrorMsg;

export type ClientMsg =
  | { type: "join"; name: string; token?: string; seat?: number }
  | { type: "sit"; seat: number }
  | { type: "standUp" }
  | { type: "placeBet"; amount: number }
  | { type: "action"; action: "hit" | "stand" | "double" | "split" }
  | { type: "insurance"; take: boolean };
