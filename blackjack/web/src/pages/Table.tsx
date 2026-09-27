import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ActionBar } from "../components/ActionBar";
import { BetControls } from "../components/BetControls";
import { DealerArea } from "../components/DealerArea";
import { InsurancePrompt } from "../components/InsurancePrompt";
import { Seat } from "../components/Seat";
import { useTable } from "../lib/useTable";
import { SEAT_COUNT } from "../types";

const NAME_KEY = "bj_name";

// Seven seats fanned around the bottom of an oval felt, dealer at top-center.
const SEAT_POSITIONS = [
  { x: 5, y: 52 },
  { x: 13, y: 76 },
  { x: 29, y: 91 },
  { x: 50, y: 96 },
  { x: 71, y: 91 },
  { x: 87, y: 76 },
  { x: 95, y: 52 },
];

const PHASE_LABEL: Record<string, string> = {
  waiting: "Waiting for players…",
  betting: "Place your bets",
  insurance: "Insurance?",
  dealing: "Dealing…",
  playerTurns: "Players' turns",
  dealerTurn: "Dealer's turn",
  payout: "Round over",
};

export default function TablePage() {
  const { code = "" } = useParams();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [draftName, setDraftName] = useState("");

  if (!name) {
    return (
      <div className="home">
        <div className="home-card">
          <h1 className="home-title">Join table {code}</h1>
          <label className="field">
            <span>Your name</span>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={24}
              autoFocus
              placeholder="e.g. Sam"
            />
          </label>
          <button
            className="btn btn-primary"
            disabled={!draftName.trim()}
            onClick={() => {
              localStorage.setItem(NAME_KEY, draftName.trim());
              setName(draftName.trim());
            }}
          >
            Sit down
          </button>
        </div>
      </div>
    );
  }

  return <TableRoom code={code} name={name} />;
}

function TableRoom({ code, name }: { code: string; name: string }) {
  const { state, status, error, send } = useTable(code, name);
  const [showLog, setShowLog] = useState(false);

  const you = state?.you ?? null;
  const yourSeat = you?.seat ?? null;
  const yourPlayer = yourSeat !== null ? state?.players[yourSeat] ?? null : null;

  const shareUrl = useMemo(() => `${window.location.origin}/t/${code}`, [code]);

  if (!state) {
    return (
      <div className="loading-screen">
        <p>{status === "closed" ? "Reconnecting…" : "Joining table…"}</p>
      </div>
    );
  }

  const canSit = yourSeat === null && (state.phase === "waiting" || state.phase === "betting");
  const canStand = yourSeat !== null && (state.phase === "waiting" || state.phase === "betting");

  const yourTurn =
    state.phase === "playerTurns" && yourSeat !== null && state.activeSeat === yourSeat && yourPlayer;
  const yourInsurancePending =
    state.phase === "insurance" &&
    yourPlayer &&
    yourPlayer.hands.length > 0 &&
    !yourPlayer.insuranceDecided;

  return (
    <div className="table-page">
      <header className="table-topbar">
        <div className="room-code">
          Table <strong>{code}</strong>
          <button
            className="btn btn-tiny"
            onClick={() => navigator.clipboard?.writeText(shareUrl).catch(() => {})}
            title={shareUrl}
          >
            Copy link
          </button>
        </div>
        <div className="phase-label">{PHASE_LABEL[state.phase]}</div>
        <div className="conn-status">
          <span className={`dot ${status === "open" ? "dot-on" : "dot-off"}`} />
          {status === "open" ? "connected" : status === "connecting" ? "connecting…" : "disconnected"}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-felt">
        <DealerArea dealer={state.dealer} shoeRemaining={state.shoeRemaining} shoeSize={state.shoeSize} />

        {Array.from({ length: SEAT_COUNT }).map((_, i) => {
          const pos = SEAT_POSITIONS[i];
          return (
            <div key={i} className="seat-slot" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <Seat
                seatIndex={i}
                player={state.players[i]}
                isYou={yourSeat === i}
                canSit={canSit}
                onSit={() => send({ type: "sit", seat: i })}
                phase={state.phase}
                activeSeat={state.activeSeat}
                activeHandIndex={state.activeHandIndex}
              />
            </div>
          );
        })}
      </div>

      <div className="table-controls">
        {canStand && (
          <button className="btn btn-tiny stand-up-btn" onClick={() => send({ type: "standUp" })}>
            Leave seat
          </button>
        )}

        {state.phase === "betting" && yourPlayer && !yourPlayer.sittingOut && yourPlayer.hands.length === 0 && (
          <BetControls
            currentBet={yourPlayer.pendingBet}
            chips={yourPlayer.chips}
            minBet={state.minBet}
            maxBet={state.maxBet}
            bettingDeadline={state.bettingDeadline}
            onBet={(amount) => send({ type: "placeBet", amount })}
          />
        )}

        {yourTurn && yourPlayer && (
          <ActionBar
            hand={yourPlayer.hands[state.activeHandIndex ?? 0]}
            chips={yourPlayer.chips}
            handCount={yourPlayer.hands.length}
            turnDeadline={state.turnDeadline}
            onAction={(action) => send({ type: "action", action })}
          />
        )}

        {yourSeat === null && (state.phase === "waiting" || state.phase === "betting") && (
          <div className="hint">Pick an empty seat to join the hand.</div>
        )}
      </div>

      {yourInsurancePending && yourPlayer && (
        <InsurancePrompt
          betAmount={yourPlayer.hands[0].bet}
          chips={yourPlayer.chips}
          deadline={state.insuranceDeadline}
          onDecide={(take) => send({ type: "insurance", take })}
        />
      )}

      <button className="log-toggle" onClick={() => setShowLog((s) => !s)}>
        {showLog ? "Hide log" : "Table log"}
      </button>
      {showLog && (
        <div className="log-panel">
          {state.log.length === 0 && <div className="log-empty">Nothing yet.</div>}
          {state.log.map((line, i) => (
            <div key={i} className="log-line">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
