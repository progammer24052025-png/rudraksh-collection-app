import { ImageResponse } from "next/og";

/**
 * The picture shown when a page is shared on WhatsApp, Instagram or Facebook
 * (pages with their own product photo use that instead). Drawn from the mala
 * seal so every share carries the brand.
 */
export const alt = "Rudraksh Collection — clothing for men, women & kids, Vadodara";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BEADS = 22;

export default function OpengraphImage() {
  const ring = 150;
  const centre = 190;
  const beads = Array.from({ length: BEADS }, (_, index) => {
    const angle = Math.PI / 2 + ((index + 0.5) / BEADS) * (Math.PI * 2 * 0.9) + Math.PI * 0.1;
    return {
      x: centre + ring * Math.cos(angle),
      y: centre + ring * Math.sin(angle),
      colour: index % 2 ? "#995C5C" : "#B07A7A",
    };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#FAF7F2",
          padding: "0 70px",
          gap: 44,
        }}
      >
        <div style={{ position: "relative", width: 380, height: 430, display: "flex" }}>
          {beads.map((bead, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                left: bead.x - 14,
                top: bead.y - 14,
                width: 28,
                height: 28,
                borderRadius: 14,
                background: bead.colour,
              }}
            />
          ))}
          <div style={{ position: "absolute", left: centre - 20, top: centre + ring - 10, width: 40, height: 40, borderRadius: 20, background: "#596650" }} />
          <div style={{ position: "absolute", left: centre - 3, top: centre + ring + 28, width: 6, height: 60, background: "#596650", borderRadius: 3 }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: centre - 80,
              width: centre * 2,
              display: "flex",
              justifyContent: "center",
              fontSize: 150,
              fontFamily: "serif",
              fontWeight: 700,
              color: "#2D2A26",
            }}
          >
            R
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 62, fontFamily: "serif", color: "#2D2A26", lineHeight: 1.05 }}>Rudraksh Collection</div>
          <div style={{ fontSize: 26, letterSpacing: 5, textTransform: "uppercase", color: "#995C5C" }}>
            Men · Women · Kids · Vadodara
          </div>
          <div style={{ fontSize: 26, color: "#6B6560", marginTop: 12 }}>
            Trusted brands · Cash on delivery · Easy returns
          </div>
        </div>
      </div>
    ),
    size,
  );
}
