import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DarshaTutor",
  description: "Private tutoring with structured bookings, availability, and recurring lessons.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        style={{
          margin: 0,
          color: "#111",
          background: "#ffffff",
        }}
      >
        {/** Global nav (role-based) */}
        {/** Note: navbar is client-side, layout can stay server-side */}
        <Navbar />
        <main className="appShell">{children}</main>
      </body>

    </html>
  );
}
