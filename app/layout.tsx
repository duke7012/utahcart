import type { Metadata, Viewport } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";

const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "UtahCart",
  description: "Fit your groceries into your day: on your way, in your time limit, with or without a car.",
};

export const viewport: Viewport = { themeColor: "#2a1a14" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
