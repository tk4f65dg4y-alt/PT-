import { useEffect, useState } from "react";

/** Seconds remaining until an epoch-ms deadline, ticking every 200ms. Null deadline -> null. */
export function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [deadline]);

  if (deadline === null) return null;
  return Math.max(0, (deadline - now) / 1000);
}
