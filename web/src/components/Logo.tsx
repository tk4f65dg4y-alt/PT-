export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <div className="brand-mark" style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <span style={{ fontSize: size * 0.42 }}>CB</span>
    </div>
  );
}
