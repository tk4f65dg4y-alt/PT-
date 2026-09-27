/** A quiet celebration for finishing a full day's session — a soft radial
 * glow that blooms and fades. No emoji particles; keeps things understated. */
export function celebrateComplete() {
  const el = document.createElement("div");
  el.className = "success-glow";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
