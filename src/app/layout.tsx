import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSessionProvider } from "@/components/auth/session-provider";
import { RootShell } from "@/components/layout/root-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "花蓮蔬果種植指南",
  description: "花蓮在地蔬果種植指南 — 作物資料庫、種植月曆、田地規劃、AI 助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <AppSessionProvider>
          <RootShell>{children}</RootShell>
        </AppSessionProvider>
      </body>
    </html>
  );
}