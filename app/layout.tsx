import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono, Libre_Baskerville, Nunito_Sans, Outfit } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Storefront-only fonts (see .theme-shop in globals.css).
const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

// Admin panel fonts (see .theme-admin in globals.css), matching the "Kelola
// toko" design: Outfit for headings, DM Sans for everything else.
const outfit = Outfit({
  variable: "--font-outfit",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jastipdinaila",
  description: "Titip beli barang Ready & Pre-Order",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${libreBaskerville.variable} ${nunitoSans.variable} ${outfit.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Top of the screen, short-lived: at the bottom they covered the
            phone buy bar and the buttons used most during live recording. */}
        <Toaster position="top-center" duration={2500} />
      </body>
    </html>
  );
}
