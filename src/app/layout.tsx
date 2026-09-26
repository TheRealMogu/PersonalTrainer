import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
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
  // Oltre a robots.ts: quello vale per i crawler che lo leggono, questo è
  // il tag che finisce in ogni pagina per chi non lo controlla nemmeno.
  robots: { index: false, follow: false },
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
        {/*
          `max-w-md` da solo, su qualunque schermo, e' la ragione per cui
          segnalato "resta un telefono anche da desktop": un rettangolo
          stretto in mezzo a un monitor vuoto. Da tablet in su (`md:`, la
          stessa soglia di `TabBar`) si allarga in due passi, non uno solo --
          uno schermo enorme con lo stesso contenuto di oggi diventerebbe
          righe di testo lunghissime da seguire, non "adattato".
        */}
        <div className="mx-auto w-full max-w-md px-5 md:max-w-2xl md:px-8 lg:max-w-3xl">
          {children}
        </div>
        <TabBar />
        <ServiceWorkerRegister />
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
