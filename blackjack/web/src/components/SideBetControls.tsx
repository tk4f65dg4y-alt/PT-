import { useState } from "react";
import { SideBetKey, SideBetsPublic } from "../types";

const QUICK_VALUES = [5, 25];

const LABEL: Record<SideBetKey, string> = {
  perfectPairs: "Perfect Pairs",
  twentyOnePlusThree: "21+3",
};
const BLURB: Record<SideBetKey, string> = {
  perfectPairs: "Your first two cards are a pair — up to 30:1",
  twentyOnePlusThree: "Your two cards + dealer's up card make a poker hand — up to 100:1",
};

function Row({
  betKey,
  amount,
  chipsLeft,
  maxSideBet,
  onSet,
}: {
  betKey: SideBetKey;
  amount: number;
  chipsLeft: number;
  maxSideBet: number;
  onSet: (amount: number) => void;
}) {
  return (
    <div className="side-bet-row">
      <div className="side-bet-info">
        <span className="side-bet-name">{LABEL[betKey]}</span>
        <span className="side-bet-blurb">{BLURB[betKey]}</span>
      </div>
      <div className="side-bet-actions">
        <span className="side-bet-amount">{amount}</span>
        {QUICK_VALUES.map((v) => (
          <button
            key={v}
            className="btn btn-tiny"
            onClick={() => onSet(Math.min(maxSideBet, amount + v, amount + chipsLeft))}
            disabled={amount + v > maxSideBet || v > chipsLeft}
          >
            +{v}
          </button>
        ))}
        <button className="btn btn-tiny btn-clear" onClick={() => onSet(0)} disabled={amount === 0}>
          Clear
        </button>
      </div>
    </div>
  );
}

export function SideBetControls({
  sideBets,
  chips,
  currentBet,
  maxSideBet,
  onSideBet,
}: {
  sideBets: SideBetsPublic;
  chips: number;
  currentBet: number;
  maxSideBet: number;
  onSideBet: (key: SideBetKey, amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const committed = sideBets.perfectPairs + sideBets.twentyOnePlusThree;
  const chipsLeft = Math.max(0, chips - currentBet - committed);

  if (!open) {
    return (
      <button className="btn btn-tiny side-bet-toggle" onClick={() => setOpen(true)}>
        + Side bets{committed > 0 ? ` (${committed} on)` : ""}
      </button>
    );
  }

  return (
    <div className="side-bet-controls">
      <div className="side-bet-header">
        <span>Side bets</span>
        <button className="btn btn-tiny" onClick={() => setOpen(false)}>
          Hide
        </button>
      </div>
      <Row
        betKey="perfectPairs"
        amount={sideBets.perfectPairs}
        chipsLeft={chipsLeft}
        maxSideBet={maxSideBet}
        onSet={(amount) => onSideBet("perfectPairs", amount)}
      />
      <Row
        betKey="twentyOnePlusThree"
        amount={sideBets.twentyOnePlusThree}
        chipsLeft={chipsLeft}
        maxSideBet={maxSideBet}
        onSet={(amount) => onSideBet("twentyOnePlusThree", amount)}
      />
    </div>
  );
}
