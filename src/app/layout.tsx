import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { TabBar } from "@/components/tab-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Trainer",
  description: "Diario alimentare e programma di allenamento",
  applicationName: "Personal Trainer",
  appleWebApp: {
    capable: true,
    title: "Trainer",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /*
   * Niente `maximumScale`: bloccare lo zoom impedisce di ingrandire a chi ha
   * la vista ridotta. Era li' per evitare che Safari zoomasse entrando in un
   * campo, ma quel caso e' gia' coperto da `globals.css`, che porta tutti gli
   * input a 16px -- sotto quella soglia lo zoom scatta comunque.
   */
  viewportFit: "cover",
  // La barra di sistema segue il tema: fissa sul chiaro, su fondo nero
  // restava una striscia bianca sopra l'app.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className="font-sans antialiased">
        <div className="mx-auto w-full max-w-md px-5">{children}</div>
        <TabBar />
        {/*
          Conteggio delle visite di Vercel. Va acceso anche dal pannello del
          progetto (Analytics -> Enable), altrimenti lo script non raccoglie
          niente. Non usa cookie e non identifica la persona.
        */}
        <Analytics />
      </body>
    </html>
  );
}
