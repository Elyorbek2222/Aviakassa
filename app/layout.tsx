import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://semavia.vercel.app"),
  title: {
    default: "SEM AviaKassa — Bilet Hisobi",
    template: "%s · SEM AviaKassa",
  },
  description: "Aviabilet hisobi va boshqaruv tizimi — SEM Avia",
  applicationName: "SEM AviaKassa",
  openGraph: {
    title: "SEM AviaKassa — Bilet Hisobi",
    description: "Aviabilet hisobi va boshqaruv tizimi",
    siteName: "SEM AviaKassa",
    url: "https://semavia.vercel.app",
    locale: "uz_UZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SEM AviaKassa — Bilet Hisobi",
    description: "Aviabilet hisobi va boshqaruv tizimi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ backgroundColor: '#0A0F0D' }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
