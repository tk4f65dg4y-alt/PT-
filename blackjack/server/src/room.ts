import { randomUUID } from "crypto";
import type { WebSocket } from "ws";
import { Shoe } from "./deck";
import { canSplit, isBust, isNaturalBlackjack, valueOf } from "./hand";
import { settleAgainstDealerBlackjack, settleAgainstDealerFinal, settleInsurance } from "./payout";
import { settlePerfectPairs, settleTwentyOnePlusThree } from "./sidebets";
import {
  BETTING_SECONDS,
  Card,
  ClientMsg,
  DISCONNECT_GRACE_MS,
  DealerPublic,
  GATHER_SECONDS,
  Hand,
  INSURANCE_SECONDS,
  MAX_BET,
  MIN_BET,
  PAYOUT_DISPLAY_SECONDS,
  PlayerPublic,
  RESHUFFLE_THRESHOLD,
  RoomPhase,
  RoomStateMsg,
  SEAT_COUNT,
  SIDE_BET_MAX,
  SideBetKey,
  SideBetResultsPublic,
  SideBetsPublic,
  STARTING_CHIPS,
  ServerMsg,
  TURN_SECONDS,
} from "./types";

export interface InternalPlayer {
  id: string;
  token: string;
  name: string;
  seat: number;
  chips: number;
  hands: Hand[];
  activeHandIndex: number;
  pendingBet: number;
  sideBets: SideBetsPublic;
  sideBetResults: SideBetResultsPublic;
  insuranceBet: number | null;
  insuranceDecided: boolean;
  connected: boolean;
  disconnectedAt: number | null;
  ws: WebSocket | null;
  sittingOut: boolean;
}

function emptyHand(bet: number): Hand {
  return { cards: [], bet, status: "active", doubled: false, fromSplit: false, isSplitAces: false };
}

export class Room {
  readonly code: string;
  private players: (InternalPlayer | null)[] = new Array(SEAT_COUNT).fill(null);
  private byToken = new Map<string, InternalPlayer>();
  private shoe = new Shoe();
  private phase: RoomPhase = "waiting";
  private dealerCards: Card[] = [];
  private dealerHoleHidden = true;
  private activeSeat: number | null = null;
  private activeHandIndex: number | null = null;
  private bettingDeadline: number | null = null;
  private turnDeadline: number | null = null;
  private insuranceDeadline: number | null = null;
  private log: string[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastActivity = Date.now();
  private dealerName = "Dealer";
  private dealerPhoto: { data: Buffer; contentType: string } | null = null;
  private dealerPhotoVersion = 0;

  constructor(code: string) {
    this.code = code;
  }

  getDealerPhoto(): { data: Buffer; contentType: string } | null {
    return this.dealerPhoto;
  }

  setDealerPhoto(data: Buffer, contentType: string) {
    this.lastActivity = Date.now();
    this.dealerPhoto = { data, contentType };
    this.dealerPhotoVersion++;
    this.pushLog(`The dealer got a new face.`);
    this.broadcast();
  }

  clearDealerPhoto() {
    this.lastActivity = Date.now();
    this.dealerPhoto = null;
    this.dealerPhotoVersion++;
    this.broadcast();
  }

  setDealerName(name: string) {
    this.lastActivity = Date.now();
    const trimmed = name.trim().slice(0, 24);
    this.dealerName = trimmed || "Dealer";
    this.broadcast();
  }

  get isEmpty(): boolean {
    return this.players.every((p) => p === null);
  }

  get idleMs(): number {
    return Date.now() - this.lastActivity;
  }

  private pushLog(msg: string) {
    this.log.push(msg);
    if (this.log.length > 30) this.log.shift();
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(ms: number, fn: () => void) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      fn();
    }, ms);
  }

  // ---------- connection lifecycle ----------

  handleJoin(ws: WebSocket, name: string, token: string | undefined): InternalPlayer {
    this.lastActivity = Date.now();
    if (token) {
      const existing = this.byToken.get(token);
      if (existing) {
        existing.ws = ws;
        existing.connected = true;
        existing.disconnectedAt = null;
        if (name.trim()) existing.name = name.trim().slice(0, 24);
        this.pushLog(`${existing.name} reconnected.`);
        this.broadcast();
        return existing;
      }
    }
    const player: InternalPlayer = {
      id: randomUUID(),
      token: randomUUID(),
      name: (name || "Player").trim().slice(0, 24) || "Player",
      seat: -1,
      chips: STARTING_CHIPS,
      hands: [],
      activeHandIndex: 0,
      pendingBet: 0,
      sideBets: { perfectPairs: 0, twentyOnePlusThree: 0 },
      sideBetResults: { perfectPairs: null, twentyOnePlusThree: null },
      insuranceBet: null,
      insuranceDecided: false,
      connected: true,
      disconnectedAt: null,
      ws,
      sittingOut: false,
    };
    this.byToken.set(player.token, player);
    return player;
  }

  handleClose(ws: WebSocket) {
    for (const p of this.players) {
      if (p && p.ws === ws) {
        p.connected = false;
        p.ws = null;
        p.disconnectedAt = Date.now();
        this.pushLog(`${p.name} disconnected.`);
        this.broadcast();
        return;
      }
    }
    // Player who never sat down: just drop them from the token map.
    for (const [tok, p] of this.byToken) {
      if (p.ws === ws) {
        this.byToken.delete(tok);
        return;
      }
    }
  }

  private pruneStale() {
    const now = Date.now();
    for (let seat = 0; seat < SEAT_COUNT; seat++) {
      const p = this.players[seat];
      if (p && !p.connected && p.disconnectedAt && now - p.disconnectedAt > DISCONNECT_GRACE_MS) {
        this.pushLog(`${p.name} left the table (timed out).`);
        this.byToken.delete(p.token);
        this.players[seat] = null;
      }
    }
  }

  // ---------- seating ----------

  sit(player: InternalPlayer, seat: number) {
    if (seat < 0 || seat >= SEAT_COUNT) throw new Error("Invalid seat.");
    if (this.phase !== "waiting" && this.phase !== "betting") {
      throw new Error("Wait for this round to finish before taking a seat.");
    }
    if (player.seat !== -1) throw new Error("You're already seated.");
    if (this.players[seat]) throw new Error("That seat is taken.");
    player.seat = seat;
    this.players[seat] = player;
    this.pushLog(`${player.name} sat down in seat ${seat + 1}.`);
    if (this.phase === "waiting") {
      this.bettingDeadline = Date.now() + GATHER_SECONDS * 1000;
      this.schedule(GATHER_SECONDS * 1000, () => this.startBetting());
      this.phase = "waiting";
    }
    this.broadcast();
  }

  startNow(player: InternalPlayer) {
    if (this.phase !== "waiting") throw new Error("The round's already starting.");
    if (player.seat === -1) throw new Error("Take a seat first.");
    this.startBetting();
  }

  standUp(player: InternalPlayer) {
    if (player.seat === -1) return;
    if (this.phase !== "waiting" && this.phase !== "betting") {
      throw new Error("You can't leave mid-round.");
    }
    this.pushLog(`${player.name} left the table.`);
    this.players[player.seat] = null;
    player.seat = -1;
    this.broadcast();
  }

  // ---------- betting ----------

  private eligiblePlayers(): InternalPlayer[] {
    return this.players.filter((p): p is InternalPlayer => !!p);
  }

  private startBetting() {
    this.pruneStale();
    const seated = this.eligiblePlayers();
    if (seated.length === 0) {
      this.phase = "waiting";
      this.broadcast();
      return;
    }
    for (const p of seated) {
      p.hands = [];
      p.pendingBet = 0;
      p.sideBets = { perfectPairs: 0, twentyOnePlusThree: 0 };
      p.sideBetResults = { perfectPairs: null, twentyOnePlusThree: null };
      p.insuranceBet = null;
      p.insuranceDecided = false;
      p.sittingOut = p.chips < MIN_BET;
    }
    if (seated.every((p) => p.sittingOut)) {
      this.phase = "waiting";
      this.pushLog("Everyone's out of chips. Waiting for new players.");
      this.broadcast();
      return;
    }
    this.phase = "betting";
    this.bettingDeadline = Date.now() + BETTING_SECONDS * 1000;
    this.pushLog("Place your bets.");
    this.schedule(BETTING_SECONDS * 1000, () => this.dealCards());
    this.broadcast();
  }

  placeBet(player: InternalPlayer, amount: number) {
    if (this.phase !== "betting") throw new Error("Betting isn't open right now.");
    if (player.seat === -1) throw new Error("Take a seat first.");
    if (player.sittingOut) throw new Error("Not enough chips to bet.");
    const clamped = Math.floor(amount);
    if (clamped !== 0 && (clamped < MIN_BET || clamped > MAX_BET)) {
      throw new Error(`Bet must be between ${MIN_BET} and ${MAX_BET}.`);
    }
    if (clamped > player.chips) throw new Error("You don't have enough chips for that bet.");
    player.pendingBet = clamped;
    if (clamped < MIN_BET) {
      // No main bet, no side bets -- a side bet always rides on a hand being dealt.
      player.sideBets = { perfectPairs: 0, twentyOnePlusThree: 0 };
    }
    this.broadcast();

    const active = this.eligiblePlayers().filter((p) => !p.sittingOut);
    if (active.length > 0 && active.every((p) => p.pendingBet >= MIN_BET)) {
      this.schedule(700, () => this.dealCards());
    }
  }

  placeSideBet(player: InternalPlayer, key: SideBetKey, amount: number) {
    if (this.phase !== "betting") throw new Error("Betting isn't open right now.");
    if (player.seat === -1) throw new Error("Take a seat first.");
    if (player.sittingOut) throw new Error("Not enough chips to bet.");
    if (player.pendingBet < MIN_BET) throw new Error("Place a main bet first.");
    const clamped = Math.floor(amount);
    if (clamped !== 0 && (clamped < MIN_BET || clamped > SIDE_BET_MAX)) {
      throw new Error(`Side bets must be between ${MIN_BET} and ${SIDE_BET_MAX}.`);
    }
    const otherKey: SideBetKey = key === "perfectPairs" ? "twentyOnePlusThree" : "perfectPairs";
    if (player.pendingBet + clamped + player.sideBets[otherKey] > player.chips) {
      throw new Error("You don't have enough chips for that bet.");
    }
    player.sideBets[key] = clamped;
    this.broadcast();
  }

  // ---------- dealing ----------

  private draw(): Card {
    if (this.shoe.remaining <= 0) this.shoe.reshuffle();
    return this.shoe.draw();
  }

  private dealCards() {
    this.pruneStale();
    const active = this.eligiblePlayers().filter((p) => !p.sittingOut && p.pendingBet >= MIN_BET);
    if (active.length === 0) {
      this.pushLog("No bets placed. Waiting for a bet.");
      this.startBetting();
      return;
    }
    if (this.shoe.remaining < RESHUFFLE_THRESHOLD) {
      this.shoe.reshuffle();
      this.pushLog("Shuffling a fresh 4-deck shoe.");
    }
    for (const p of active) {
      p.chips -= p.pendingBet;
      p.hands = [emptyHand(p.pendingBet)];
      p.activeHandIndex = 0;
    }
    this.dealerCards = [];
    this.dealerHoleHidden = true;

    for (const p of active) p.hands[0].cards.push(this.draw());
    this.dealerCards.push(this.draw());
    for (const p of active) p.hands[0].cards.push(this.draw());
    this.dealerCards.push(this.draw());

    this.resolveSideBets(active);

    this.phase = "dealing";
    this.pushLog("Dealing.");
    this.broadcast();

    this.schedule(1400, () => this.afterDeal());
  }

  private resolveSideBets(active: InternalPlayer[]) {
    const dealerUp = this.dealerCards[0];
    for (const p of active) {
      const cards = p.hands[0].cards as [Card, Card];
      if (p.sideBets.perfectPairs > 0) {
        const settled = settlePerfectPairs(cards, p.sideBets.perfectPairs);
        p.chips -= p.sideBets.perfectPairs;
        p.chips += settled.payout;
        p.sideBetResults.perfectPairs = settled;
      }
      if (p.sideBets.twentyOnePlusThree > 0) {
        const settled = settleTwentyOnePlusThree(cards, dealerUp, p.sideBets.twentyOnePlusThree);
        p.chips -= p.sideBets.twentyOnePlusThree;
        p.chips += settled.payout;
        p.sideBetResults.twentyOnePlusThree = settled;
      }
    }
  }

  private afterDeal() {
    const upCard = this.dealerCards[0];
    if (upCard.rank === "A") {
      this.phase = "insurance";
      this.insuranceDeadline = Date.now() + INSURANCE_SECONDS * 1000;
      this.pushLog("Dealer shows an Ace. Insurance?");
      this.broadcast();
      this.schedule(INSURANCE_SECONDS * 1000, () => this.resolveInsurance());
      return;
    }
    if (upCard.rank === "10" || upCard.rank === "J" || upCard.rank === "Q" || upCard.rank === "K") {
      if (valueOf(this.dealerCards).total === 21) {
        this.revealDealerBlackjack();
        return;
      }
    }
    this.startPlayerTurns();
  }

  takeInsurance(player: InternalPlayer, take: boolean) {
    if (this.phase !== "insurance") throw new Error("Insurance isn't open right now.");
    if (player.hands.length === 0 || player.insuranceDecided) return;
    player.insuranceDecided = true;
    if (take) {
      const amount = Math.floor(player.hands[0].bet / 2);
      if (amount > player.chips) throw new Error("Not enough chips for insurance.");
      player.chips -= amount;
      player.insuranceBet = amount;
    }
    this.broadcast();
    const active = this.eligiblePlayers().filter((p) => p.hands.length > 0);
    if (active.every((p) => p.insuranceDecided)) {
      this.resolveInsurance();
    }
  }

  private resolveInsurance() {
    if (this.phase !== "insurance") return;
    const dealerBlackjack = valueOf(this.dealerCards).total === 21;
    if (dealerBlackjack) {
      this.revealDealerBlackjack();
      return;
    }
    // Insurance bets that were placed are simply lost; nothing else to settle.
    this.startPlayerTurns();
  }

  private revealDealerBlackjack() {
    this.dealerHoleHidden = false;
    this.pushLog("Dealer has blackjack.");
    const dealerHasBJ = true;
    for (const p of this.eligiblePlayers()) {
      if (p.hands.length === 0) continue;
      if (p.insuranceBet) {
        p.chips += settleInsurance(p.insuranceBet, dealerHasBJ);
      }
      const hand = p.hands[0];
      const settled = settleAgainstDealerBlackjack(hand);
      hand.result = settled.result;
      hand.payout = settled.payout;
      p.chips += settled.payout;
    }
    this.finishRound();
  }

  // ---------- player turns ----------

  private handAt(seat: number, handIndex: number): Hand | null {
    const p = this.players[seat];
    if (!p) return null;
    return p.hands[handIndex] ?? null;
  }

  private findNextTurn(fromSeat: number, fromHand: number): { seat: number; hand: number } | null {
    for (let s = fromSeat; s < SEAT_COUNT; s++) {
      const p = this.players[s];
      if (!p || p.hands.length === 0) continue;
      const startHand = s === fromSeat ? fromHand : 0;
      for (let h = startHand; h < p.hands.length; h++) {
        if (p.hands[h].status === "active") return { seat: s, hand: h };
      }
    }
    return null;
  }

  private startPlayerTurns() {
    // Natural blackjacks don't get to act.
    for (const p of this.eligiblePlayers()) {
      if (p.hands.length && isNaturalBlackjack(p.hands[0])) {
        p.hands[0].status = "blackjack";
      }
    }
    const next = this.findNextTurn(0, 0);
    if (!next) {
      this.dealerTurn();
      return;
    }
    this.phase = "playerTurns";
    this.goToTurn(next.seat, next.hand);
  }

  private goToTurn(seat: number, hand: number) {
    this.activeSeat = seat;
    this.activeHandIndex = hand;
    const player = this.players[seat]!;
    const h = player.hands[hand];
    // Split hands start with a single card; deal the second one now.
    if (h.cards.length === 1) {
      h.cards.push(this.draw());
      if (h.isSplitAces) {
        h.status = "stand";
        this.advanceTurn();
        return;
      }
    }
    if (valueOf(h.cards).total === 21) {
      h.status = "stand";
      this.advanceTurn();
      return;
    }
    this.turnDeadline = Date.now() + TURN_SECONDS * 1000;
    this.broadcast();
    this.schedule(TURN_SECONDS * 1000, () => this.autoStand());
  }

  private advanceTurn() {
    if (this.activeSeat === null || this.activeHandIndex === null) return;
    const next = this.findNextTurn(this.activeSeat, this.activeHandIndex + 1);
    if (!next) {
      this.activeSeat = null;
      this.activeHandIndex = null;
      this.turnDeadline = null;
      this.dealerTurn();
      return;
    }
    this.goToTurn(next.seat, next.hand);
  }

  private autoStand() {
    if (this.phase !== "playerTurns" || this.activeSeat === null || this.activeHandIndex === null) return;
    const player = this.players[this.activeSeat];
    if (!player) return;
    const hand = player.hands[this.activeHandIndex];
    if (hand && hand.status === "active") {
      hand.status = "stand";
      this.pushLog(`${player.name} timed out and stood.`);
    }
    this.advanceTurn();
  }

  private currentActor(): InternalPlayer | null {
    if (this.activeSeat === null) return null;
    return this.players[this.activeSeat];
  }

  private assertTurn(player: InternalPlayer) {
    if (this.phase !== "playerTurns") throw new Error("It's not the player-action phase.");
    if (this.activeSeat !== player.seat) throw new Error("It's not your turn.");
  }

  action(player: InternalPlayer, action: "hit" | "stand" | "double" | "split") {
    this.assertTurn(player);
    const handIndex = this.activeHandIndex!;
    const hand = player.hands[handIndex];
    if (!hand || hand.status !== "active") throw new Error("That hand is already done.");

    if (action === "hit") {
      hand.cards.push(this.draw());
      if (isBust(hand.cards)) {
        hand.status = "bust";
        this.pushLog(`${player.name} busts.`);
        this.advanceTurn();
      } else if (valueOf(hand.cards).total === 21) {
        hand.status = "stand";
        this.advanceTurn();
      } else {
        this.turnDeadline = Date.now() + TURN_SECONDS * 1000;
        this.broadcast();
        this.schedule(TURN_SECONDS * 1000, () => this.autoStand());
      }
      return;
    }

    if (action === "stand") {
      hand.status = "stand";
      this.advanceTurn();
      return;
    }

    if (action === "double") {
      if (hand.cards.length !== 2 || hand.isSplitAces) throw new Error("Can't double this hand.");
      if (player.chips < hand.bet) throw new Error("Not enough chips to double.");
      player.chips -= hand.bet;
      hand.bet *= 2;
      hand.doubled = true;
      hand.cards.push(this.draw());
      hand.status = isBust(hand.cards) ? "bust" : "stand";
      this.advanceTurn();
      return;
    }

    if (action === "split") {
      if (!canSplit(hand)) throw new Error("Can't split this hand.");
      if (player.hands.length >= 4) throw new Error("Split limit reached.");
      if (player.chips < hand.bet) throw new Error("Not enough chips to split.");
      player.chips -= hand.bet;
      const isAceSplit = hand.cards[0].rank === "A";
      const secondCard = hand.cards.pop()!;
      hand.fromSplit = true;
      hand.isSplitAces = isAceSplit;
      const newHand: Hand = {
        cards: [secondCard],
        bet: hand.bet,
        status: "active",
        doubled: false,
        fromSplit: true,
        isSplitAces: isAceSplit,
      };
      player.hands.splice(handIndex + 1, 0, newHand);
      this.broadcast();
      // Re-enter the current hand (it now has one card again and needs its second dealt).
      this.goToTurn(player.seat, handIndex);
      return;
    }
  }

  // ---------- dealer & payout ----------

  private dealerTurn() {
    this.phase = "dealerTurn";
    this.dealerHoleHidden = false;
    this.broadcast();

    const anyoneStillIn = this.eligiblePlayers().some(
      (p) => p.hands.length > 0 && p.hands.some((h) => h.status === "stand" || h.status === "blackjack")
    );

    const drawLoop = () => {
      if (anyoneStillIn && valueOf(this.dealerCards).total < 17) {
        this.dealerCards.push(this.draw());
        this.broadcast();
        this.schedule(900, drawLoop);
        return;
      }
      this.settlePayouts();
    };
    this.schedule(900, drawLoop);
  }

  private settlePayouts() {
    for (const p of this.eligiblePlayers()) {
      if (p.hands.length === 0) continue;
      for (const hand of p.hands) {
        const settled = settleAgainstDealerFinal(hand, this.dealerCards);
        hand.result = settled.result;
        hand.payout = settled.payout;
        p.chips += settled.payout;
      }
    }
    this.finishRound();
  }

  private finishRound() {
    this.phase = "payout";
    this.activeSeat = null;
    this.activeHandIndex = null;
    this.turnDeadline = null;
    this.insuranceDeadline = null;
    this.broadcast();
    this.schedule(PAYOUT_DISPLAY_SECONDS * 1000, () => this.startBetting());
  }

  // ---------- message dispatch ----------

  handleMessage(player: InternalPlayer, msg: ClientMsg) {
    this.lastActivity = Date.now();
    switch (msg.type) {
      case "join":
        return; // handled by handleJoin before dispatch
      case "sit":
        this.sit(player, msg.seat);
        return;
      case "standUp":
        this.standUp(player);
        return;
      case "startNow":
        this.startNow(player);
        return;
      case "placeBet":
        this.placeBet(player, msg.amount);
        return;
      case "placeSideBet":
        this.placeSideBet(player, msg.key, msg.amount);
        return;
      case "insurance":
        this.takeInsurance(player, msg.take);
        return;
      case "action":
        this.action(player, msg.action);
        return;
    }
  }

  // ---------- state serialization ----------

  private dealerPublic(): DealerPublic {
    const visible = this.dealerHoleHidden ? this.dealerCards.slice(0, 1) : this.dealerCards;
    const v = this.dealerHoleHidden ? null : valueOf(this.dealerCards);
    return {
      cards: visible,
      holeHidden: this.dealerHoleHidden,
      total: v ? v.total : null,
      isSoft: v ? v.soft : false,
      isBlackjack: v ? v.total === 21 && this.dealerCards.length === 2 : false,
      isBust: v ? v.total > 21 : false,
      name: this.dealerName,
      photoVersion: this.dealerPhotoVersion,
    };
  }

  private playerPublic(p: InternalPlayer): PlayerPublic {
    return {
      id: p.id,
      name: p.name,
      seat: p.seat,
      chips: p.chips,
      connected: p.connected,
      pendingBet: p.pendingBet,
      sideBets: p.sideBets,
      sideBetResults: p.sideBetResults,
      hands: p.hands,
      activeHandIndex: p.activeHandIndex,
      insuranceBet: p.insuranceBet,
      insuranceDecided: p.insuranceDecided,
      sittingOut: p.sittingOut,
    };
  }

  stateFor(player: InternalPlayer | null): RoomStateMsg {
    return {
      type: "state",
      code: this.code,
      phase: this.phase,
      players: this.players.map((p) => (p ? this.playerPublic(p) : null)),
      dealer: this.dealerPublic(),
      activeSeat: this.activeSeat,
      activeHandIndex: this.activeHandIndex,
      turnDeadline: this.turnDeadline,
      bettingDeadline: this.phase === "betting" || this.phase === "waiting" ? this.bettingDeadline : null,
      insuranceDeadline: this.insuranceDeadline,
      shoeRemaining: this.shoe.remaining,
      shoeSize: this.shoe.size,
      minBet: MIN_BET,
      maxBet: MAX_BET,
      log: this.log.slice(-8),
      you: player ? { id: player.id, seat: player.seat === -1 ? null : player.seat } : null,
    };
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  broadcast() {
    for (const p of this.byToken.values()) {
      if (p.ws) this.send(p.ws, this.stateFor(p));
    }
  }

  sendWelcome(player: InternalPlayer) {
    if (!player.ws) return;
    this.send(player.ws, { type: "welcome", playerId: player.id, token: player.token });
    this.send(player.ws, this.stateFor(player));
  }

  sendError(player: InternalPlayer, message: string) {
    if (player.ws) this.send(player.ws, { type: "error", message });
  }
}
