import { useEffect, useRef, useState } from "react";

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch {
    // audio not available — ignore
  }
}

function format(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RestTimer({ defaultSeconds = 60 }: { defaultSeconds?: number }) {
  const [duration, setDuration] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            if (!firedRef.current) {
              firedRef.current = true;
              beep();
            }
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  function reset(newDuration?: number) {
    const d = newDuration ?? duration;
    setRunning(false);
    firedRef.current = false;
    setDuration(d);
    setRemaining(d);
  }

  function adjust(delta: number) {
    setRemaining((r) => Math.max(0, r + delta));
    firedRef.current = false;
  }

  return (
    <div className="timer-box">
      <div className="muted small">Rest timer</div>
      <div className="timer-display" style={{ color: remaining === 0 ? "var(--warn)" : undefined }}>
        {format(remaining)}
      </div>
      <div className="timer-controls">
        <button className="btn secondary sm" onClick={() => adjust(-15)}>
          −15s
        </button>
        {!running ? (
          <button
            className="btn sm"
            onClick={() => {
              firedRef.current = false;
              if (remaining === 0) reset(duration);
              setRunning(true);
            }}
          >
            Start
          </button>
        ) : (
          <button className="btn secondary sm" onClick={() => setRunning(false)}>
            Pause
          </button>
        )}
        <button className="btn secondary sm" onClick={() => adjust(15)}>
          +15s
        </button>
        <button className="btn ghost sm" onClick={() => reset()}>
          Reset
        </button>
      </div>
    </div>
  );
}
