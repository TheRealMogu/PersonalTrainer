import type { Metadata, Viewport } from "next";
import { TabBar } from "@/components/tab-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Trainer",
  description: "Diario alimentare e programma di allenamento",
  appleWebApp: {
    capable: true,
    title: "Personal Trainer",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f5f7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className="font-sans antialiased">
        <div className="mx-auto w-full max-w-md px-5">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
