import { Hand, HandResult } from "./types";
import { isBust, isNaturalBlackjack, valueOf } from "./hand";

export interface Settled {
  result: HandResult;
  payout: number; // total chips returned to the player for this hand (0 = lost the bet)
}

/** Dealer peeked and has a natural blackjack: every hand is settled immediately. */
export function settleAgainstDealerBlackjack(hand: Hand): Settled {
  if (isNaturalBlackjack(hand)) {
    return { result: "push", payout: hand.bet };
  }
  return { result: "lose", payout: 0 };
}

/** Dealer does not have blackjack: settle a finished (stand/bust) hand against the dealer's final total. */
export function settleAgainstDealerFinal(hand: Hand, dealerCards: Hand["cards"]): Settled {
  if (hand.status === "bust" || isBust(hand.cards)) {
    return { result: "bust", payout: 0 };
  }
  if (isNaturalBlackjack(hand)) {
    return { result: "blackjack", payout: Math.floor(hand.bet * 2.5) };
  }
  const playerTotal = valueOf(hand.cards).total;
  const dealerBust = isBust(dealerCards);
  const dealerTotal = valueOf(dealerCards).total;
  if (dealerBust || playerTotal > dealerTotal) {
    return { result: "win", payout: hand.bet * 2 };
  }
  if (playerTotal === dealerTotal) {
    return { result: "push", payout: hand.bet };
  }
  return { result: "lose", payout: 0 };
}

/** Insurance pays 2:1 if the dealer has blackjack, otherwise the insurance stake is lost. */
export function settleInsurance(insuranceBet: number, dealerHasBlackjack: boolean): number {
  return dealerHasBlackjack ? insuranceBet * 3 : 0;
}
