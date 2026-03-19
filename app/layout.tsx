import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "動画テロップ誤字脱字チェッカー",
  description: "Gemini 1.5を活用した動画テロップ校正ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`antialiased bg-slate-50 text-slate-900 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
