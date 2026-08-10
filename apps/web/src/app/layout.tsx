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
  // OAuth 同意画面のアプリ名「Truss公式アプリ」と一致させる（Google ブランド審査が title を照合する）
  title: "Truss公式アプリ",
  description: "神戸大学留学生支援サークル Truss の公式アプリです。/ This is the official app of Truss, the international student support club at Kobe University.",
  icons: {
    icon: "/truss-favicon.svg",
    shortcut: "/truss-favicon.svg",
    apple: "/icons/truss-180.png",
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
