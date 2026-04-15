"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, Loader2, CheckCircle, Lock, ExternalLink, Clock, Fuel, Info } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TOKEN_LOGOS: Record<string, string> = {
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/tether.png",
  STRK: "https://assets.coingecko.com/coins/images/26433/small/starknet.png",
};

const BRIDGE_TOKENS = [
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "USDT", name: "Tether USD" },
];

const WITHDRAW_TOKENS = [
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "STRK", name: "Starknet Token" },
  { symbol: "USDC", name: "USD Coin" },
];

type Mode = "deposit" | "withdraw";

interface QuoteInfo {
  estimatedFee: string;
  estimatedTime: string;
  route: string;
}

export function DepositTab() {
  const { address, isConnected } = useWallet();
  const [mode, setMode] = useState<Mode>("deposit");
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [showTokenList, setShowTokenList] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const tokenList = mode === "deposit" ? BRIDGE_TOKENS : WITHDRAW_TOKENS;
  const fromChain = mode === "deposit" ? "Ethereum" : "Starknet";
  const toChain = mode === "deposit" ? "Starknet" : "Ethereum";
  const fromColor = mode === "deposit" ? "#627EEA" : "#00D4FF";
  const toColor = mode === "deposit" ? "#00D4FF" : "#627EEA";
  const fromLogo = mode === "deposit" ? TOKEN_LOGOS.ETH : TOKEN_LOGOS.STRK;
  const toLogo = mode === "deposit" ? TOKEN_LOGOS.STRK : TOKEN_LOGOS.ETH;

  useEffect(() => {
    setAmount("");
    setQuote(null);
    setSelectedToken("ETH");
  }, [mode]);

  useEffect(() => {
    if (!amount || parseFloat(amount) === 0) {
      setQuote(null);
      return;
    }
    setIsQuoting(true);
    const timeout = setTimeout(() => {
      setQuote({
        estimatedFee: mode === "deposit" ? "~$4-8" : "~$2-5",
        estimatedTime: mode === "deposit" ? "~10 min" : "~30 min",
        route: mode === "deposit" ? "Official Starknet Bridge" : "Starknet to Ethereum Bridge",
      });
      setIsQuoting(false);
    }, 700);
    return () => clearTimeout(timeout);
  }, [amount, selectedToken, mode]);

  const handleBridge = async () => {
    if (!amount || parseFloat(amount) === 0) return;
    setIsBridging(true);
    try {
      await new Promise((res) => setTimeout(res, 2000));
      const mockHash = "0x" + Math.random().toString(16).slice(2, 18);
      setLastTxHash(mockHash);
      setAmount("");
      setQuote(null);
      toast.success(mode === "deposit" ? "Deposit initiated!" : "Withdrawal initiated!", {
        description: "Your " + selectedToken + " is on its way. " + (mode === "deposit" ? "~10 min" : "~30 min") + " to arrive.",
      });
    } catch (err: any) {
      toast.error("Bridge failed", { description: err.message });
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
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
              ? "Deposit assets from Ethereum into your Starknet wallet."
              : "Withdraw assets from Starknet back to Ethereum."}
          </p>

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
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, " + fromColor + "40, " + toColor + "60)" }} />
              {mode === "deposit"
                ? <ArrowDownToLine className="w-4 h-4 text-zap-accent shrink-0" />
                : <ArrowUpFromLine className="w-4 h-4 text-zap-green shrink-0" />}
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, " + toColor + "40, " + toColor + "10)" }} />
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
      >
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
          <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
            <p className="text-zap-subtext text-xs mb-3">
              {"Amount to " + (mode === "deposit" ? "deposit" : "withdraw")}
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
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zap-surface border border-zap-border hover:border-zap-accent/40 transition-colors"
                >
                  <img
                    src={TOKEN_LOGOS[selectedToken]}
                    alt={selectedToken}
                    className="w-5 h-5 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="font-display font-semibold text-zap-text text-sm">{selectedToken}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zap-subtext" />
                </button>

                {showTokenList && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowTokenList(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 top-full mt-1 w-44 bg-zap-surface border border-zap-border rounded-xl shadow-2xl z-20 overflow-hidden"
                    >
                      {tokenList.map((token) => (
                        <button
                          key={token.symbol}
                          onClick={() => { setSelectedToken(token.symbol); setShowTokenList(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zap-border/50 transition-colors text-left",
                            selectedToken === token.symbol && "bg-zap-accent/5"
                          )}
                        >
                          <img
                            src={TOKEN_LOGOS[token.symbol]}
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

          <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
            <p className="text-zap-subtext text-xs mb-2">{"Recipient (" + toChain + ")"}</p>
            <p className="font-mono text-sm text-zap-text break-all">
              {address ?? "Connect wallet to auto-fill"}
            </p>
          </div>

          <AnimatePresence>
            {(isQuoting || quote) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-zap-bg border border-zap-border p-3 space-y-2"
              >
                {isQuoting ? (
                  <div className="flex items-center gap-2 text-zap-subtext text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Estimating fees...
                  </div>
                ) : quote ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-zap-subtext">
                        <Fuel className="w-3 h-3" />Bridge fee
                      </span>
                      <span className="text-zap-text font-mono">{quote.estimatedFee}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-zap-subtext">
                        <Clock className="w-3 h-3" />Est. time
                      </span>
                      <span className="text-zap-text">{quote.estimatedTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-zap-subtext">
                        <ArrowDownToLine className="w-3 h-3" />Route
                      </span>
                      <span className="text-zap-text">{quote.route}</span>
                    </div>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-start gap-2 p-3 bg-zap-accent/5 border border-zap-accent/15 rounded-xl">
            <Info className="w-3.5 h-3.5 text-zap-accent shrink-0 mt-0.5" />
            <p className="text-zap-subtext text-xs leading-relaxed">
              {mode === "deposit"
                ? "Requires MetaMask to sign on L1. Assets arrive on Starknet in ~10 minutes."
                : "Withdraw from Starknet back to Ethereum. Arrives in ~30 minutes via the official bridge."}
            </p>
          </div>

          {lastTxHash && (
            <div className="flex items-center gap-2 p-3 bg-zap-green/10 border border-zap-green/20 rounded-xl">
              <CheckCircle className="w-4 h-4 text-zap-green shrink-0" />
              <a
                href={"https://voyager.online/tx/" + lastTxHash}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zap-green text-xs flex items-center gap-1 hover:underline"
              >
                Transaction confirmed <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {!isConnected ? (
            <div className="flex items-center gap-2 p-3 bg-zap-bg rounded-xl text-zap-subtext text-sm border border-zap-border">
              <Lock className="w-4 h-4" />Connect wallet to bridge
            </div>
          ) : (
            <button
              onClick={handleBridge}
              disabled={!amount || parseFloat(amount) === 0 || isBridging}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-display font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                mode === "deposit"
                  ? "bg-zap-accent text-zap-bg hover:bg-zap-accent/90 shadow-glow-accent"
                  : "bg-zap-green text-zap-bg hover:bg-zap-green/90 shadow-glow-green"
              )}
            >
              {isBridging ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
              ) : mode === "deposit" ? (
                <><ArrowDownToLine className="w-4 h-4" />{"Bridge " + selectedToken + " to Starknet"}</>
              ) : (
                <><ArrowUpFromLine className="w-4 h-4" />{"Withdraw " + selectedToken + " to Ethereum"}</>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
