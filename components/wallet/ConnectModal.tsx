"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, AlertCircle } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { cn } from "@/lib/utils";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WALLETS = [
  {
    id: "argent" as const,
    name: "Argent X",
    description: "Most popular Starknet wallet",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
        <rect width="32" height="32" rx="8" fill="#FF875B" />
        <path d="M16 6L26 26H6L16 6Z" fill="white" />
      </svg>
    ),
  },
  {
    id: "braavos" as const,
    name: "Braavos",
    description: "Smart wallet with biometrics",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
        <rect width="32" height="32" rx="8" fill="#F5A623" />
        <circle cx="16" cy="16" r="8" fill="white" />
        <circle cx="16" cy="16" r="4" fill="#F5A623" />
      </svg>
    ),
  },
  {
    id: "cartridge" as const,
    name: "Cartridge",
    description: "Gaming wallet with passkeys",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
        <rect width="32" height="32" rx="8" fill="#0E1218" />
        <rect x="6" y="10" width="20" height="12" rx="2" fill="#00D4FF" />
        <rect x="10" y="14" width="4" height="4" rx="1" fill="#0E1218" />
        <rect x="18" y="14" width="4" height="4" rx="1" fill="#0E1218" />
      </svg>
    ),
  },
];

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const { connect, isConnecting } = useWallet();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (walletId: "argent" | "braavos" | "cartridge") => {
    setConnectingId(walletId);
    setError(null);
    try {
      await connect(walletId);
      onClose();
    } catch (err: any) {
      setError(err.message || "Connection failed. Make sure the extension is installed.");
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm bg-zap-surface border border-zap-border rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-zap-text">Connect Wallet</h2>
                <p className="text-zap-subtext text-sm mt-0.5">Choose your Starknet wallet</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-zap-border transition-colors text-zap-subtext hover:text-zap-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnect(wallet.id)}
                  disabled={isConnecting}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left",
                    "border-zap-border hover:border-zap-accent/50 hover:bg-zap-accent/5",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    connectingId === wallet.id && "border-zap-accent/50 bg-zap-accent/5"
                  )}
                >
                  {wallet.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-zap-text text-sm">{wallet.name}</div>
                    <div className="text-zap-subtext text-xs mt-0.5">{wallet.description}</div>
                  </div>
                  {connectingId === wallet.id ? (
                    <div className="w-4 h-4 border-2 border-zap-accent/30 border-t-zap-accent rounded-full animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-zap-border" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 p-3 bg-zap-bg rounded-xl">
              <ExternalLink className="w-3.5 h-3.5 text-zap-subtext shrink-0" />
              <p className="text-zap-subtext text-xs">
                Don't have a wallet?{" "}
                <a
                  href="https://www.argent.xyz/argent-x/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zap-accent hover:underline"
                >
                  Install Argent X
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
