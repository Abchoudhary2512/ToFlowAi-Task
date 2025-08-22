import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

// Modern font pair: Inter (sans) + Roboto Mono (mono)
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Todo Application",
  description: "A clean and minimal Todo application built with Next.js + Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-gray-50 text-gray-900">
      <body
        className={`${inter.variable} ${robotoMono.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
       
        <main className="flex-1 w-full max-w-3xl mx-auto p-4">{children}</main>

      
        <footer className="text-center text-xs text-gray-500 py-4">
          © {new Date().getFullYear()} Todo Application
        </footer>
      </body>
    </html>
  );
}
