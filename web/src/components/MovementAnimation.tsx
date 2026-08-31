type Pattern =
  | "SQUAT"
  | "HINGE"
  | "PUSH"
  | "PULL"
  | "LUNGE"
  | "CORE"
  | "CARRY"
  | "CARDIO"
  | "MOBILITY";

const ICONS: Record<Pattern, JSX.Element> = {
  SQUAT: (
    <g className="anim">
      <rect x="4" y="26" width="7" height="12" rx="2" fill="currentColor" />
      <rect x="53" y="26" width="7" height="12" rx="2" fill="currentColor" />
      <rect x="12" y="21" width="6" height="22" rx="2" fill="currentColor" />
      <rect x="46" y="21" width="6" height="22" rx="2" fill="currentColor" />
      <rect x="18" y="29.5" width="28" height="5" rx="2.5" fill="currentColor" />
    </g>
  ),
  HINGE: (
    <g className="anim">
      <circle cx="32" cy="14" r="6" fill="currentColor" />
      <rect x="29" y="20" width="6" height="26" rx="3" fill="currentColor" />
      <rect x="18" y="44" width="14" height="6" rx="3" fill="currentColor" />
      <rect x="34" y="44" width="14" height="6" rx="3" fill="currentColor" />
    </g>
  ),
  PUSH: (
    <g className="anim">
      <path d="M14 20 L28 32 L14 44" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M34 20 L48 32 L34 44" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  ),
  PULL: (
    <g className="anim">
      <path d="M50 20 L36 32 L50 44" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M30 20 L16 32 L30 44" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  ),
  LUNGE: (
    <g className="anim">
      <circle cx="24" cy="14" r="6" fill="currentColor" />
      <rect x="21" y="20" width="6" height="16" rx="3" fill="currentColor" />
      <rect x="14" y="34" width="7" height="18" rx="3" fill="currentColor" transform="rotate(-18 17 34)" />
      <rect x="27" y="34" width="7" height="20" rx="3" fill="currentColor" transform="rotate(22 30 34)" />
    </g>
  ),
  CORE: (
    <g className="anim">
      <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="6" />
      <rect x="20" y="29" width="24" height="6" rx="3" fill="currentColor" />
    </g>
  ),
  CARRY: (
    <g className="anim">
      <rect x="6" y="24" width="10" height="16" rx="3" fill="currentColor" />
      <rect x="48" y="24" width="10" height="16" rx="3" fill="currentColor" />
      <rect x="16" y="29" width="32" height="6" rx="3" fill="currentColor" />
    </g>
  ),
  CARDIO: (
    <g className="anim">
      <path
        d="M6 34 H20 L26 20 L34 46 L40 30 L46 34 H58"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  ),
  MOBILITY: (
    <g className="anim">
      <path
        d="M16 40 A18 18 0 1 1 48 40"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M48 40 L40 40 M48 40 L48 32" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
};

const LABELS: Record<Pattern, string> = {
  SQUAT: "Squat",
  HINGE: "Hinge",
  PUSH: "Push",
  PULL: "Pull",
  LUNGE: "Lunge",
  CORE: "Core",
  CARRY: "Carry",
  CARDIO: "Cardio",
  MOBILITY: "Mobility",
};

export default function MovementAnimation({ pattern, size = 44 }: { pattern: Pattern; size?: number }) {
  return (
    <div
      className={`movement-icon pattern-${pattern}`}
      style={{ width: size, height: size, color: "var(--accent-2)" }}
      title={LABELS[pattern]}
    >
      <svg viewBox="0 0 64 64" style={{ width: size * 0.6, height: size * 0.6 }}>
        {ICONS[pattern]}
      </svg>
    </div>
  );
}

export { LABELS as MOVEMENT_LABELS };
export type { Pattern as MovementPattern };
