import type { Metadata } from "next";
import { Geist, Geist_Mono, Island_Moments } from "next/font/google";
import "./globals.css";
import "../styles/globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const islandMoments = Island_Moments({
  variable: "--font-island-moments",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Truss",
  description: "Truss App (migrating to Next.js)",
  icons: {
    icon: "/truss-favicon.svg",
    shortcut: "/truss-favicon.svg",
    apple: "/truss-favicon.svg",
    other: {
      rel: "icon",
      url: "/truss-favicon.svg",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${islandMoments.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
