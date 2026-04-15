"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { TabNav } from "@/components/layout/TabNav";
import { PortfolioTab } from "@/components/features/PortfolioTab";
import { EarnTab } from "@/components/features/EarnTab";
import { TradeTab } from "@/components/features/TradeTab";
import { DepositTab } from "@/components/features/DepositTab";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { useWallet } from "@/lib/wallet-context";
import { TabId } from "@/types";

export default function Home() {
  const { isConnected, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<TabId>("portfolio");
  const [showConnectModal, setShowConnectModal] = useState(false);

  const handleBack = () => {
    disconnect();
  };

  const tabContent: Record<TabId, React.ReactNode> = {
    portfolio: <PortfolioTab onNavigate={(tab) => setActiveTab(tab)} />,
    earn: <EarnTab />,
    trade: <TradeTab />,
    deposit: <DepositTab />,
  };

  return (
    <div className="min-h-screen bg-zap-bg">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="fixed top-0 left-0 right-0 h-96 pointer-events-none bg-gradient-to-b from-zap-accent/5 to-transparent" />

      <Navbar />

      <main className="relative pt-16">
        {!isConnected ? (
          <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-xl"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
                className="w-20 h-20 rounded-2xl bg-zap-accent/10 border border-zap-accent/20 flex items-center justify-center mx-auto mb-8 shadow-glow-accent"
              >
                <Zap className="w-10 h-10 text-zap-accent" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-5xl sm:text-6xl font-bold text-zap-text leading-tight mb-4"
              >
                Your Starknet
                <br />
                <span className="text-zap-accent">DeFi Command</span>
                <br />
                Center
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-zap-subtext font-body text-lg leading-relaxed mb-10"
              >
                Swap tokens, earn staking rewards, and bridge assets from
                Ethereum — all in one clean interface. Powered by Starkzap.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mb-10"
              >
                {[
                  { label: "Portfolio", color: "text-zap-accent", bg: "bg-zap-accent/10 border-zap-accent/20" },
                  { label: "Swap via AVNU", color: "text-zap-accent", bg: "bg-zap-accent/10 border-zap-accent/20" },
                  { label: "Stake STRK", color: "text-zap-green", bg: "bg-zap-green/10 border-zap-green/20" },
                  { label: "Bridge from ETH", color: "text-zap-accent", bg: "bg-zap-accent/10 border-zap-accent/20" },
                ].map(({ label, color, bg }) => (
                  <span
                    key={label}
                    className={"px-3 py-1.5 rounded-full border text-xs font-display font-semibold " + bg + " " + color}
                  >
                    {label}
                  </span>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center"
              >
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-zap-accent text-zap-bg font-display font-bold text-base hover:bg-zap-accent/90 transition-all shadow-glow-accent"
                >
                  <Zap className="w-4 h-4" />
                  Connect Wallet
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-12 text-zap-muted text-xs font-body"
              >
                Built on Starknet · Powered by Starkzap SDK
              </motion.p>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBack}
                className="p-2 rounded-xl border border-zap-border text-zap-subtext hover:text-zap-accent hover:border-zap-accent/50 hover:bg-zap-accent/5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <TabNav activeTab={activeTab} onChange={setActiveTab} />
              <div className="w-24" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {tabContent[activeTab]}
              </motion.div>
            </AnimatePresence>

            <footer className="border-t border-zap-border/50 py-4 mt-8">
              <div className="flex items-center justify-center gap-2 text-zap-subtext text-xs font-body">
                <span className="w-1.5 h-1.5 rounded-full bg-zap-green inline-block" />
                <span>Built with</span>
                <a
                  href="https://docs.starknet.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zap-accent hover:underline font-semibold"
                >
                  Starkzap SDK
                </a>
                <span>·</span>
                <a
                  href="https://starknet.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zap-accent hover:underline font-semibold"
                >
                  Starknet Mainnet
                </a>
              </div>
            </footer>
          </div>
        )}
      </main>

      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </div>
  );
}