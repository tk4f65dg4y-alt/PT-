const MAX_LAYERS = 16;

/** A physical-looking stack of face-down cards in a wooden shoe, height tracking how much of the shoe is left. */
export function ShoeStack({ remaining, size }: { remaining: number; size: number }) {
  const pct = size > 0 ? remaining / size : 0;
  const layers = Math.max(remaining > 0 ? 1 : 0, Math.round(pct * MAX_LAYERS));

  return (
    <div className="shoe-stack" title={`${remaining} of ${size} cards left in the shoe`}>
      <div className="shoe-holder">
        <div className="shoe-deck" style={{ height: `${Math.max(6, layers * 2.2)}px` }}>
          {Array.from({ length: layers }).map((_, i) => (
            <div key={i} className="shoe-layer" style={{ bottom: `${i * 2.2}px` }} />
          ))}
        </div>
      </div>
      <span className="shoe-label">
        {remaining} / {size} cards
      </span>
    </div>
  );
}
