import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AccountSync } from "./account";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BeeLow",
  description: "Your groceries, fitted to your day: store stops, online orders, or a little of both.",
};

export const viewport: Viewport = { themeColor: "#fffaf0" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <AccountSync />
      </body>
    </html>
  );
}
