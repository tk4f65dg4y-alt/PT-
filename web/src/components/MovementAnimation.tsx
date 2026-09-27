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

const S = { stroke: "currentColor", strokeWidth: 3.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" as const };

const ICONS: Record<Pattern, JSX.Element> = {
  SQUAT: (
    <g className="anim">
      <rect x="5" y="24" width="7" height="16" rx="2.5" {...S} />
      <rect x="52" y="24" width="7" height="16" rx="2.5" {...S} />
      <line x1="15" y1="32" x2="49" y2="32" {...S} />
    </g>
  ),
  HINGE: (
    <g className="anim">
      <circle cx="32" cy="14" r="5.5" {...S} />
      <path d="M32 19 V32 M32 32 L20 44 M32 32 L46 40" {...S} />
    </g>
  ),
  PUSH: (
    <g className="anim">
      <path d="M14 20 L28 32 L14 44" {...S} />
      <path d="M34 20 L48 32 L34 44" {...S} />
    </g>
  ),
  PULL: (
    <g className="anim">
      <path d="M50 20 L36 32 L50 44" {...S} />
      <path d="M30 20 L16 32 L30 44" {...S} />
    </g>
  ),
  LUNGE: (
    <g className="anim">
      <circle cx="26" cy="13" r="5.5" {...S} />
      <path d="M26 18 V30" {...S} />
      <path d="M26 30 L17 50" {...S} />
      <path d="M26 30 L38 38 L34 50" {...S} />
    </g>
  ),
  CORE: (
    <g className="anim">
      <circle cx="32" cy="32" r="17" {...S} />
      <line x1="21" y1="32" x2="43" y2="32" {...S} />
    </g>
  ),
  CARRY: (
    <g className="anim">
      <rect x="7" y="23" width="9" height="18" rx="3" {...S} />
      <rect x="48" y="23" width="9" height="18" rx="3" {...S} />
      <line x1="16" y1="32" x2="48" y2="32" {...S} />
    </g>
  ),
  CARDIO: (
    <g className="anim">
      <path d="M6 34 H20 L26 20 L34 46 L40 30 L46 34 H58" {...S} />
    </g>
  ),
  MOBILITY: (
    <g className="anim">
      <path d="M16 40 A18 18 0 1 1 48 40" {...S} />
      <path d="M48 40 L40 40 M48 40 L48 32" {...S} />
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
