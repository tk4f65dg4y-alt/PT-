const PIECES = ["🎉", "💪", "🔥", "⭐", "✅"];

/** Lightweight celebratory burst — a handful of emoji particles that fall and
 * fade, then remove themselves. No canvas/library needed. */
export function burstConfetti() {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.textContent = PIECES[i % PIECES.length];
    el.style.left = `${10 + Math.random() * 80}vw`;
    el.style.animationDelay = `${Math.random() * 0.25}s`;
    el.style.fontSize = `${16 + Math.random() * 14}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
}
