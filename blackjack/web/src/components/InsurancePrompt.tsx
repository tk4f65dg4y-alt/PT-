import { useCountdown } from "../lib/useCountdown";

export function InsurancePrompt({
  betAmount,
  chips,
  deadline,
  onDecide,
}: {
  betAmount: number;
  chips: number;
  deadline: number | null;
  onDecide: (take: boolean) => void;
}) {
  const secs = useCountdown(deadline);
  const cost = Math.floor(betAmount / 2);
  const canAfford = chips >= cost;

  return (
    <div className="modal-backdrop">
      <div className="modal insurance-modal">
        <h3>Insurance?</h3>
        <p>
          Dealer is showing an Ace. Insure your {betAmount}-chip bet for {cost} chips — pays 2:1 if the dealer has
          blackjack.
        </p>
        {secs !== null && <div className="modal-timer">{Math.ceil(secs)}s to decide</div>}
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => onDecide(true)} disabled={!canAfford}>
            Take insurance
          </button>
          <button className="btn" onClick={() => onDecide(false)}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
