import { ImageResponse } from "next/og";

/**
 * Icona per la schermata Home di iOS. iOS non accetta SVG qui, serve un PNG:
 * lo generiamo in fase di build, senza tenere un file binario nella repo.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const ACCENT = "#0071e3";

/**
 * Manubrio disegnato con rettangoli: niente testo, quindi nessun font da
 * caricare. Stesse proporzioni di assets/icon.png, che alimenta l'app nativa.
 */
export default function AppleIcon() {
  const bar = (width: number, height: number) => ({
    width,
    height,
    background: "#ffffff",
    borderRadius: 4,
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
          background: ACCENT,
        }}
      >
        <div style={bar(17, 43)} />
        <div style={{ width: 4 }} />
        <div style={bar(24, 74)} />
        <div style={bar(43, 13)} />
        <div style={bar(24, 74)} />
        <div style={{ width: 4 }} />
        <div style={bar(17, 43)} />
      </div>
    ),
    size,
  );
}
