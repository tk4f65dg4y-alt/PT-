import { PlayerPublic, RoomPhase, SideBetSettled } from "../types";
import { ChipStack } from "./Chip";
import { HandView } from "./HandView";

const SIDE_BET_RESULT_LABEL: Record<string, string> = {
  mixedPair: "Mixed Pair",
  coloredPair: "Colored Pair",
  perfectPair: "Perfect Pair!",
  flush: "Flush",
  straight: "Straight",
  threeOfAKind: "Three of a Kind",
  straightFlush: "Straight Flush!",
  suitedTrips: "Suited Trips!!",
  lose: "No win",
};

function SideBetTag({ label, settled }: { label: string; settled: SideBetSettled }) {
  const won = settled.payout > 0;
  return (
    <span className={`tag side-bet-tag ${won ? "result-win" : "result-lose"}`}>
      {label}: {SIDE_BET_RESULT_LABEL[settled.result] || settled.result}
      {won ? ` +${settled.payout}` : ""}
    </span>
  );
}

export function Seat({
  seatIndex,
  player,
  isYou,
  canSit,
  onSit,
  phase,
  activeSeat,
  activeHandIndex,
}: {
  seatIndex: number;
  player: PlayerPublic | null;
  isYou: boolean;
  canSit: boolean;
  onSit: () => void;
  phase: RoomPhase;
  activeSeat: number | null;
  activeHandIndex: number | null;
}) {
  if (!player) {
    return (
      <div className="seat seat-empty">
        {canSit ? (
          <button className="btn btn-sit" onClick={onSit}>
            Sit here
          </button>
        ) : (
          <div className="seat-placeholder">Seat {seatIndex + 1}</div>
        )}
      </div>
    );
  }

  const isTurn = phase === "playerTurns" && activeSeat === seatIndex;

  return (
    <div className={`seat seat-taken ${isYou ? "seat-you" : ""} ${isTurn ? "seat-turn" : ""}`}>
      <div className="seat-header">
        <span className={`dot ${player.connected ? "dot-on" : "dot-off"}`} />
        <span className="seat-name">
          {player.name}
          {isYou ? " (you)" : ""}
        </span>
        <span className="seat-chips">{player.chips}</span>
      </div>

      {player.hands.length > 0 ? (
        <div className="seat-hands">
          {player.hands.map((h, i) => (
            <HandView key={i} hand={h} isActive={isTurn && activeHandIndex === i} compact={player.hands.length > 1} />
          ))}
        </div>
      ) : player.pendingBet > 0 ? (
        <ChipStack amount={player.pendingBet} />
      ) : player.sittingOut ? (
        <div className="seat-status">sitting out</div>
      ) : phase === "betting" ? (
        <div className="seat-status">waiting for bet{"…"}</div>
      ) : null}

      {player.insuranceBet ? <div className="seat-status">insurance: {player.insuranceBet}</div> : null}

      {(player.sideBetResults.perfectPairs || player.sideBetResults.twentyOnePlusThree) && (
        <div className="side-bet-tags">
          {player.sideBetResults.perfectPairs && (
            <SideBetTag label="PP" settled={player.sideBetResults.perfectPairs} />
          )}
          {player.sideBetResults.twentyOnePlusThree && (
            <SideBetTag label="21+3" settled={player.sideBetResults.twentyOnePlusThree} />
          )}
        </div>
      )}
    </div>
  );
}
