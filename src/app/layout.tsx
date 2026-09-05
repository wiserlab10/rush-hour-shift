import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sans = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "러시아워 쉬프트",
  description: "골드 vs 실버, 카드를 내고 주차 판을 밀어 먼저 빼져나기",
  applicationName: "러시아워 쉬프트",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#070b14",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-[#070b14] font-sans text-white">{children}</body>
    </html>
  );
}
