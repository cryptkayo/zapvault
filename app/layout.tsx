import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet-context";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZapVault — Starknet DeFi Command Center",
  description: "Swap, stake, bridge, and manage your Starknet assets in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${dmMono.variable}`}>
      <body className="bg-zap-bg text-zap-text antialiased">
        <WalletProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "#0E1218",
                border: "1px solid #1A2030",
                color: "#E8EDF5",
                fontFamily: "var(--font-display)",
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}