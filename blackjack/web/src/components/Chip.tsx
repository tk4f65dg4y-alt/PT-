const DENOMS = [500, 100, 25, 5, 1];
const COLOR: Record<number, string> = {
  500: "chip-purple",
  100: "chip-black",
  25: "chip-green",
  5: "chip-red",
  1: "chip-white",
};

/** Breaks an amount into a small stack of chip denominations, capped so it never gets absurd. */
function breakDown(amount: number): number[] {
  const out: number[] = [];
  let remaining = amount;
  for (const d of DENOMS) {
    while (remaining >= d && out.length < 6) {
      out.push(d);
      remaining -= d;
    }
  }
  return out;
}

export function ChipStack({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  const chips = breakDown(amount);
  return (
    <div className="chip-stack" title={`${amount} chips`}>
      {chips.map((d, i) => (
        <div key={i} className={`chip ${COLOR[d]}`} style={{ bottom: `${i * 4}px` }}>
          {d}
        </div>
      ))}
      <div className="chip-total">{amount}</div>
    </div>
  );
}
