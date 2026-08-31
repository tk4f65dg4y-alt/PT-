export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <div className="brand-mark" style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <svg viewBox="0 0 64 64" fill="none" style={{ width: size * 0.58, height: size * 0.58 }}>
        <rect x="4" y="26" width="8" height="12" rx="2.5" fill="white" />
        <rect x="52" y="26" width="8" height="12" rx="2.5" fill="white" />
        <rect x="12" y="21" width="7" height="22" rx="2.5" fill="white" />
        <rect x="45" y="21" width="7" height="22" rx="2.5" fill="white" />
        <rect x="19" y="29.5" width="26" height="5" rx="2.5" fill="white" />
      </svg>
    </div>
  );
}
