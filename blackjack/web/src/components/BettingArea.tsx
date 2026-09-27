import { useState } from "react";
import { useCountdown } from "../lib/useCountdown";
import { SideBetKey, SideBetsPublic } from "../types";

const CHIP_VALUES = [5, 25, 100, 500];
const CHIP_CLASS: Record<number, string> = {
  5: "chip-red",
  25: "chip-green",
  100: "chip-black",
  500: "chip-purple",
};

type Spot = "main" | SideBetKey;

const SPOT_LABEL: Record<Spot, string> = {
  main: "Main Bet",
  perfectPairs: "Perfect Pairs",
  twentyOnePlusThree: "21+3",
};

function BetSpot({
  spot,
  amount,
  big,
  focused,
  onFocus,
}: {
  spot: Spot;
  amount: number;
  big?: boolean;
  focused: boolean;
  onFocus: () => void;
}) {
  return (
    <button
      className={`bet-spot ${big ? "bet-spot-main" : "bet-spot-side"} ${focused ? "bet-spot-focused" : ""} ${amount > 0 ? "bet-spot-filled" : ""}`}
      onClick={onFocus}
    >
      {amount > 0 ? <span className="bet-spot-amount">{amount}</span> : <span className="bet-spot-empty">+</span>}
      <span className="bet-spot-label">{SPOT_LABEL[spot]}</span>
    </button>
  );
}

export function BettingArea({
  currentBet,
  sideBets,
  chips,
  minBet,
  maxBet,
  maxSideBet,
  bettingDeadline,
  onBet,
  onSideBet,
}: {
  currentBet: number;
  sideBets: SideBetsPublic;
  chips: number;
  minBet: number;
  maxBet: number;
  maxSideBet: number;
  bettingDeadline: number | null;
  onBet: (amount: number) => void;
  onSideBet: (key: SideBetKey, amount: number) => void;
}) {
  const secs = useCountdown(bettingDeadline);
  const [focused, setFocused] = useState<Spot>("main");

  const amounts: Record<Spot, number> = {
    main: currentBet,
    perfectPairs: sideBets.perfectPairs,
    twentyOnePlusThree: sideBets.twentyOnePlusThree,
  };
  const spotMax: Record<Spot, number> = { main: maxBet, perfectPairs: maxSideBet, twentyOnePlusThree: maxSideBet };
  const committed = currentBet + sideBets.perfectPairs + sideBets.twentyOnePlusThree;
  const spendable = Math.max(0, chips - committed + amounts[focused]);

  function addChip(v: number) {
    const next = Math.min(spotMax[focused], spendable, amounts[focused] + v);
    if (focused === "main") onBet(next);
    else onSideBet(focused, next);
  }

  function clearFocused() {
    if (focused === "main") onBet(0);
    else onSideBet(focused, 0);
  }

  const sideBetsLocked = currentBet < minBet;

  return (
    <div className="betting-area">
      <div className="bet-status">
        <span>Your bet: {currentBet}</span>
        {secs !== null && <span className="bet-timer">{Math.ceil(secs)}s</span>}
      </div>

      <div className="bet-spots">
        <BetSpot
          spot="perfectPairs"
          amount={amounts.perfectPairs}
          focused={focused === "perfectPairs"}
          onFocus={() => !sideBetsLocked && setFocused("perfectPairs")}
        />
        <BetSpot spot="main" amount={amounts.main} big focused={focused === "main"} onFocus={() => setFocused("main")} />
        <BetSpot
          spot="twentyOnePlusThree"
          amount={amounts.twentyOnePlusThree}
          focused={focused === "twentyOnePlusThree"}
          onFocus={() => !sideBetsLocked && setFocused("twentyOnePlusThree")}
        />
      </div>
      {sideBetsLocked && <div className="bet-hint">Place your main bet to unlock side bets.</div>}

      <div className="chip-tray">
        {CHIP_VALUES.map((v) => (
          <button
            key={v}
            className={`chip chip-btn ${CHIP_CLASS[v]}`}
            onClick={() => addChip(v)}
            disabled={amounts[focused] + v > spotMax[focused] || v > spendable}
          >
            {v}
          </button>
        ))}
        <button className="btn btn-clear" onClick={clearFocused} disabled={amounts[focused] === 0}>
          Clear
        </button>
      </div>
      <div className="bet-limits">
        {focused === "main" ? `Table limits ${minBet}–${maxBet}` : `Side bet limits ${minBet}–${maxSideBet}`} —
        placing on <strong>{SPOT_LABEL[focused]}</strong>
      </div>
    </div>
  );
}
