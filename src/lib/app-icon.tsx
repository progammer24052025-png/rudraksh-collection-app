/**
 * The mala seal drawn as a square app icon, for the home-screen install
 * (Android/Chrome) and the Apple touch icon. Rendered to PNG by next/og.
 *
 * `padding` leaves the safe zone Android needs for "maskable" icons, which
 * are cropped to a circle or squircle by the phone.
 */
export function AppIcon({ size, padding = 0.12 }: { size: number; padding?: number }) {
  const inner = size * (1 - padding * 2);
  const centre = size / 2;
  const ring = inner * 0.38;
  const bead = Math.max(2, inner * 0.052);
  const beads = 22;

  return (
    <div style={{ width: size, height: size, display: "flex", position: "relative", background: "#FAF7F2" }}>
      {Array.from({ length: beads }, (_, index) => {
        const angle = Math.PI / 2 + ((index + 0.5) / beads) * (Math.PI * 2 * 0.9) + Math.PI * 0.1;
        const x = centre + ring * Math.cos(angle);
        const y = centre - inner * 0.04 + ring * Math.sin(angle);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x - bead,
              top: y - bead,
              width: bead * 2,
              height: bead * 2,
              borderRadius: bead,
              background: index % 2 ? "#995C5C" : "#B07A7A",
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: centre - bead * 1.4,
          top: centre - inner * 0.04 + ring - bead * 0.4,
          width: bead * 2.8,
          height: bead * 2.8,
          borderRadius: bead * 1.4,
          background: "#596650",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: centre - inner * 0.04 - inner * 0.27,
          width: size,
          display: "flex",
          justifyContent: "center",
          fontSize: inner * 0.42,
          fontFamily: "serif",
          fontWeight: 700,
          color: "#2D2A26",
          lineHeight: 1.2,
        }}
      >
        R
      </div>
    </div>
  );
}
