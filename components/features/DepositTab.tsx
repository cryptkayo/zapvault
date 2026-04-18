"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownToLine, ArrowUpFromLine, ChevronDown,
  Loader2, ExternalLink, Lock, Clock, Fuel, Info, RefreshCw
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useBridge } from "@/hooks/useBridge";
import { cn } from "@/lib/utils";

type Mode = "deposit" | "withdraw";

const STARKGATE_URL = "https://starkgate.starknet.io";

const BRIDGE_FEES: Record<string, { fee: string; time: string }> = {
  ETH:  { fee: "~$3-8",  time: "~10 min" },
  USDC: { fee: "~$4-10", time: "~10 min" },
  USDT: { fee: "~$4-10", time: "~10 min" },
  STRK: { fee: "~$2-5",  time: "~10 min" },
};

export function DepositTab() {
  const { address, isConnected } = useWallet();
  const { tokens, isLoading } = useBridge(address);

  const [mode, setMode] = useState<Mode>("deposit");
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [showTokenList, setShowTokenList] = useState(false);

  const fromChain = mode === "deposit" ? "Ethereum" : "Starknet";
  const toChain   = mode === "deposit" ? "Starknet" : "Ethereum";
  const fromColor = mode === "deposit" ? "#627EEA" : "#00D4FF";
  const toColor   = mode === "deposit" ? "#00D4FF" : "#627EEA";

  const fromLogo = mode === "deposit"
    ? "https://assets.coingecko.com/coins/images/279/small/ethereum.png"
    : "https://assets.coingecko.com/coins/images/26433/small/starknet.png";
  const toLogo = mode === "deposit"
    ? "https://assets.coingecko.com/coins/images/26433/small/starknet.png"
    : "https://assets.coingecko.com/coins/images/279/small/ethereum.png";

  useEffect(() => {
    setAmount("");
    setSelectedToken("ETH");
  }, [mode]);

  const selectedFee = BRIDGE_FEES[selectedToken] ?? { fee: "~$3-8", time: "~10 min" };

  // Build StarkGate URL with prefilled params
  const starkgateUrl = amount && parseFloat(amount) > 0
    ? `${STARKGATE_URL}/?type=${mode}&token=${selectedToken}&amount=${amount}&recipient=${address ?? ""}`
    : STARKGATE_URL;

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-zap-surface border border-zap-border p-6"
      >
        <div className="absolute inset-0 bg-glow-accent pointer-events-none" />
        <div className="relative">
          <h2 className="font-display text-xl font-bold text-zap-text">
            {mode === "deposit" ? "Bridge to Starknet" : "Withdraw from Starknet"}
          </h2>
          <p className="text-zap-subtext text-sm mt-1">
            {mode === "deposit"
              ? "Bridge assets from Ethereum into Starknet via StarkGate."
              : "Withdraw assets from Starknet back to Ethereum."}
          </p>

          {/* Chain route display */}
          <div className="flex items-center gap-3 mt-4">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: fromColor + "18", border: "1px solid " + fromColor + "30" }}
            >
              <img src={fromLogo} alt={fromChain} className="w-4 h-4 rounded-full" />
              <span className="text-xs font-display font-semibold" style={{ color: fromColor }}>
                {fromChain}
              </span>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${fromColor}40, ${toColor}60)` }} />
              {mode === "deposit"
                ? <ArrowDownToLine className="w-4 h-4 text-zap-accent shrink-0" />
                : <ArrowUpFromLine className="w-4 h-4 text-zap-green shrink-0" />}
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${toColor}40, ${toColor}10)` }} />
            </div>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: toColor + "18", border: "1px solid " + toColor + "30" }}
            >
              <img src={toLogo} alt={toChain} className="w-4 h-4 rounded-full" />
              <span className="text-xs font-display font-semibold" style={{ color: toColor }}>
                {toChain}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
      >
        {/* Deposit / Withdraw toggle */}
        <div className="flex p-1 gap-1 border-b border-zap-border bg-zap-bg">
          {(["deposit", "withdraw"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-display font-semibold transition-all",
                mode === m ? "bg-zap-surface text-zap-text shadow-sm" : "text-zap-subtext hover:text-zap-text"
              )}
            >
              {m === "deposit"
                ? <ArrowDownToLine className="w-3.5 h-3.5" />
                : <ArrowUpFromLine className="w-3.5 h-3.5" />}
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3">
          {/* Token + Amount input */}
          <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
            <p className="text-zap-subtext text-xs mb-3">
              Amount to {mode === "deposit" ? "deposit" : "withdraw"}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={!isConnected}
                className="flex-1 bg-transparent font-mono text-2xl text-zap-text placeholder-zap-muted focus:outline-none min-w-0 disabled:opacity-50"
              />
              <div className="relative">
                <button
                  onClick={() => setShowTokenList(!showTokenList)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zap-surface border border-zap-border hover:border-zap-accent/40 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zap-subtext" />
                  ) : (
                    <img
                      src={selectedTokenData?.logoUrl || `https://assets.coingecko.com/coins/images/279/small/ethereum.png`}
                      alt={selectedToken}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <span className="font-display font-semibold text-zap-text text-sm">{selectedToken}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zap-subtext" />
                </button>

                {showTokenList && !isLoading && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowTokenList(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-zap-surface border border-zap-border rounded-xl shadow-2xl z-20 overflow-hidden max-h-64 overflow-y-auto"
                    >
                      {tokens.map((token) => (
                        <button
                          key={token.symbol}
                          onClick={() => { setSelectedToken(token.symbol); setShowTokenList(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zap-border/50 transition-colors text-left",
                            selectedToken === token.symbol && "bg-zap-accent/5"
                          )}
                        >
                          <img
                            src={token.logoUrl}
                            alt={token.symbol}
                            className="w-6 h-6 rounded-full shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div>
                            <p className="font-display font-semibold text-zap-text text-sm">{token.symbol}</p>
                            <p className="text-zap-subtext text-xs">{token.name}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
            <p className="text-zap-subtext text-xs mb-2">Recipient ({toChain})</p>
            <p className="font-mono text-sm text-zap-text break-all">
              {address ?? "Connect wallet to auto-fill"}
            </p>
          </div>

          {/* Fee estimate */}
          {amount && parseFloat(amount) > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl bg-zap-bg border border-zap-border p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zap-subtext">
                  <Fuel className="w-3 h-3" />Bridge fee
                </span>
                <span className="text-zap-text font-mono">{selectedFee.fee}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zap-subtext">
                  <Clock className="w-3 h-3" />Est. time
                </span>
                <span className="text-zap-text">{selectedFee.time}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zap-subtext">
                  <ArrowDownToLine className="w-3 h-3" />Route
                </span>
                <span className="text-zap-text">StarkGate (Official)</span>
              </div>
            </motion.div>
          )}

          {/* Info notice */}
          <div className="flex items-start gap-2 p-3 bg-zap-accent/5 border border-zap-accent/15 rounded-xl">
            <Info className="w-3.5 h-3.5 text-zap-accent shrink-0 mt-0.5" />
            <p className="text-zap-subtext text-xs leading-relaxed">
              {mode === "deposit"
                ? "Bridging from Ethereum requires signing on L1 via MetaMask. ZapVault pre-fills your details on StarkGate — the official Starknet bridge powered by Starkzap SDK."
                : "Withdraw from Starknet back to Ethereum. ZapVault pre-fills your details on StarkGate for a seamless experience."}
            </p>
          </div>

          {/* SDK tokens badge */}
          {!isLoading && tokens.length > 0 && (
            <p className="text-center text-zap-muted text-xs">
              {tokens.length} bridgeable tokens fetched via Starkzap SDK
            </p>
          )}

          {/* Action button */}
          {!isConnected ? (
            <div className="flex items-center gap-2 p-3 bg-zap-bg rounded-xl text-zap-subtext text-sm border border-zap-border">
              <Lock className="w-4 h-4" />Connect wallet to bridge
            </div>
          ) : (
            <a
              href={starkgateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-display font-bold text-sm transition-colors",
                mode === "deposit"
                  ? "bg-zap-accent text-zap-bg hover:bg-zap-accent/90 shadow-glow-accent"
                  : "bg-zap-green text-zap-bg hover:bg-zap-green/90"
              )}
            >
              {mode === "deposit"
                ? <><ArrowDownToLine className="w-4 h-4" />Bridge {selectedToken} to Starknet <ExternalLink className="w-3.5 h-3.5 ml-1" /></>
                : <><ArrowUpFromLine className="w-4 h-4" />Withdraw {selectedToken} to Ethereum <ExternalLink className="w-3.5 h-3.5 ml-1" /></>}
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}