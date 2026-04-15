"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ChevronDown, LogOut, Copy, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { NETWORKS } from "@/lib/sdk";

export function Navbar() {
  const { isConnected, displayAddress, address, disconnect, network } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-zap-border/50 bg-zap-bg/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zap-accent/10 border border-zap-accent/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-zap-accent" />
            </div>
            <span className="font-display font-bold text-lg text-zap-text tracking-tight">
              ZapVault
            </span>
            <span className="hidden sm:flex items-center px-2 py-0.5 rounded-md bg-zap-accent/10 border border-zap-accent/20 text-zap-accent text-xs font-mono">
              {network === "mainnet" ? "Mainnet" : "Sepolia"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zap-border bg-zap-surface text-zap-text hover:border-zap-accent/40 transition-all"
                >
                  <div className="w-2 h-2 rounded-full bg-zap-green" />
                  <span className="font-mono text-sm">{displayAddress}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zap-subtext" />
                </button>

                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-zap-surface border border-zap-border rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <button
                      onClick={copyAddress}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zap-border/50 transition-colors text-zap-subtext hover:text-zap-text text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? "Copied!" : "Copy address"}
                    </button>
                    <a
                      href={NETWORKS.mainnet.explorer + "/contract/" + address}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zap-border/50 transition-colors text-zap-subtext hover:text-zap-text text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Voyager
                    </a>
                    <div className="border-t border-zap-border" />
                    <button
                      onClick={() => { disconnect(); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-zap-subtext hover:text-red-400 text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zap-accent text-zap-bg font-display font-semibold text-sm hover:bg-zap-accent/90 transition-colors shadow-glow-accent"
              >
                <Zap className="w-3.5 h-3.5" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {showDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
      )}

      <ConnectModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
