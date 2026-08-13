import type { Metadata } from "next";
import { Orbitron, Space_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Ardak AI - Voice Assistant",
  description: "AI-powered voice assistant with conversation memory and vision capabilities",
  keywords: ["AI", "voice assistant", "Gemini", "speech recognition", "vision AI"],
  authors: [{ name: "Ulagat", url: "https://github.com/ulacoder" }],
  openGraph: {
    title: "Ardak AI - Voice Assistant",
    description: "AI-powered voice assistant with conversation memory and vision capabilities",
    type: "website",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${orbitron.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-orbitron)]">{children}</body>
    </html>
  );
}
