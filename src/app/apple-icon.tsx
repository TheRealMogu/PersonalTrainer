import { ImageResponse } from "next/og";

/**
 * Icona per la schermata Home di iOS. iOS non accetta SVG qui, serve un PNG:
 * lo generiamo in fase di build, senza tenere un file binario nella repo.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const ACCENT = "#0071e3";

/** Manubrio disegnato con rettangoli: niente testo, quindi nessun font da caricare. */
export default function AppleIcon() {
  const bar = (width: number, height: number) => ({
    width,
    height,
    background: "#ffffff",
    borderRadius: 6,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: ACCENT,
        }}
      >
        <div style={bar(14, 46)} />
        <div style={bar(18, 86)} />
        <div style={bar(40, 14)} />
        <div style={bar(18, 86)} />
        <div style={bar(14, 46)} />
      </div>
    ),
    size,
  );
}
