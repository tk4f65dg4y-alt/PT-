// Shared game types. Mirrored (by hand) in web/src/types.ts for the client.

export const SEAT_COUNT = 7;
export const DECK_COUNT = 4;
export const STARTING_CHIPS = 1000;
export const MIN_BET = 5;
export const MAX_BET = 500;
export const SIDE_BET_MAX = 100;
export const BETTING_SECONDS = 20;
export const TURN_SECONDS = 20;
export const INSURANCE_SECONDS = 12;
export const PAYOUT_DISPLAY_SECONDS = 7;
export const RESHUFFLE_THRESHOLD = 52; // reshuffle shoe once fewer cards remain than this
export const GATHER_SECONDS = 12; // waiting-room grace period before the first betting round
export const DISCONNECT_GRACE_MS = 5 * 60 * 1000; // seat freed if a player doesn't reconnect within this

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

export type SideBetKey = "perfectPairs" | "twentyOnePlusThree";

export interface SideBetSettled {
  result: string; // "mixedPair" | "coloredPair" | "perfectPair" | "flush" | "straight" | "threeOfAKind" | "straightFlush" | "suitedTrips" | "lose"
  payout: number; // total chips returned (0 = lost the side bet)
}

export interface SideBetsPublic {
  perfectPairs: number;
  twentyOnePlusThree: number;
}

export interface SideBetResultsPublic {
  perfectPairs: SideBetSettled | null;
  twentyOnePlusThree: SideBetSettled | null;
}

export interface PlayerPublic {
  id: string;
  name: string;
  seat: number;
  chips: number;
  connected: boolean;
  pendingBet: number;
  sideBets: SideBetsPublic;
  sideBetResults: SideBetResultsPublic;
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
  cards: Card[]; // only the up card while hole card is hidden
  holeHidden: boolean;
  total: number | null; // null while hole card hidden
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
  name: string;
  photoVersion: number; // 0 = no custom photo set; bump on each upload so clients bust their cache
}

export const MAX_DEALER_PHOTO_BYTES = 4 * 1024 * 1024;

export interface RoomStateMsg {
  type: "state";
  code: string;
  phase: RoomPhase;
  players: (PlayerPublic | null)[]; // length SEAT_COUNT, indexed by seat
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
  | { type: "startNow" }
  | { type: "placeBet"; amount: number }
  | { type: "placeSideBet"; key: SideBetKey; amount: number }
  | { type: "action"; action: "hit" | "stand" | "double" | "split" }
  | { type: "insurance"; take: boolean };
