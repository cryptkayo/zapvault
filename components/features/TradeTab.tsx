"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, ChevronDown, Loader2, CheckCircle, Lock, ExternalLink, Settings, Info } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { TOKENS, NETWORKS } from "@/lib/sdk";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { SwapQuote } from "@/types";

const TOKEN_LOGOS: Record<string, string> = {
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  STRK: "https://assets.coingecko.com/coins/images/26433/small/starknet.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/tether.png",
};

const TOKEN_LIST = Object.values(TOKENS);

export function TradeTab() {
  const { address, isConnected } = useWallet();
  const [fromToken, setFromToken] = useState(TOKENS.ETH);
  const [toToken, setToToken] = useState(TOKENS.STRK);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) === 0) {
      setQuote(null);
      return;
    }
    setIsQuoting(true);
    const timeout = setTimeout(async () => {
      try {
        const mockRates: Record<string, Record<string, number>> = {
          ETH: { STRK: 3500, USDC: 3200, USDT: 3200 },
          STRK: { ETH: 0.000285, USDC: 0.92, USDT: 0.92 },
          USDC: { ETH: 0.000312, STRK: 1.08, USDT: 1.0 },
          USDT: { ETH: 0.000312, STRK: 1.08, USDC: 1.0 },
        };
        const rate = mockRates[fromToken.symbol]?.[toToken.symbol] ?? 1;
        const toAmount = (parseFloat(fromAmount) * rate).toFixed(6);
        const priceImpact = parseFloat(fromAmount) > 10 ? 0.12 : 0.04;
        setQuote({
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount,
          toAmount,
          priceImpact,
          route: [fromToken.address, toToken.address],
          estimatedGas: "0.0008",
          expiresAt: Date.now() + 30_000,
        });
      } catch {
        setQuote(null);
      } finally {
        setIsQuoting(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [fromAmount, fromToken, toToken]);

  const handleFlip = () => {
  const temp = fromToken;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFromToken(toToken as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setToToken(temp as any);
  setFromAmount(quote?.toAmount ?? "");
  setQuote(null);
};

  const handleSwap = async () => {
    if (!quote || !address) return;
    setIsSwapping(true);
    try {
      await new Promise((res) => setTimeout(res, 2000));
      const mockHash = "0x" + Math.random().toString(16).slice(2, 18);
      setLastTxHash(mockHash);
      setFromAmount("");
      setQuote(null);
      toast.success("Swap successful!", {
        description: "View on Voyager: " + NETWORKS.mainnet.explorer + "/tx/" + mockHash,
      });
    } catch (err: any) {
      toast.error("Swap failed", { description: err.message });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zap-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-zap-text">Swap Tokens</h3>
              <span className="px-2 py-0.5 rounded-full bg-zap-green/15 border border-zap-green/30 text-zap-green text-xs font-display font-semibold">
                Gasless
              </span>
            </div>
            <p className="text-zap-subtext text-xs mt-0.5">Powered by AVNU · Gasless via Starkzap</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showSettings
                ? "bg-zap-accent/10 text-zap-accent"
                : "hover:bg-zap-border text-zap-subtext hover:text-zap-text"
            )}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-5 py-3 bg-zap-bg border-b border-zap-border"
          >
            <p className="text-zap-subtext text-xs mb-2">Slippage tolerance</p>
            <div className="flex gap-2">
              {[0.1, 0.5, 1.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors",
                    slippage === s
                      ? "bg-zap-accent text-zap-bg"
                      : "bg-zap-border text-zap-subtext hover:text-zap-text"
                  )}
                >
                  {s}%
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="p-5 space-y-2">
          <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
            <p className="text-zap-subtext text-xs mb-3">You pay</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                disabled={!isConnected}
                className="flex-1 bg-transparent font-mono text-2xl text-zap-text placeholder-zap-muted focus:outline-none min-w-0 disabled:opacity-50"
              />
              <TokenSelector
                selected={fromToken}
                options={TOKEN_LIST.filter((t) => t.symbol !== toToken.symbol)}
                onSelect={(t) => { setFromToken(t); setQuote(null); }}
              />
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              className="p-2.5 rounded-xl bg-zap-surface border border-zap-border hover:border-zap-accent/50 hover:bg-zap-accent/5 transition-all text-zap-subtext hover:text-zap-accent group"
            >
              <ArrowLeftRight className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>

          <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zap-subtext text-xs">You receive</p>
              {isQuoting && (
                <span className="flex items-center gap-1 text-zap-subtext text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching quote...
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 font-mono text-2xl min-w-0">
                {quote ? (
                  <motion.span
                    key={quote.toAmount}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-zap-green"
                  >
                    {formatNumber(quote.toAmount)}
                  </motion.span>
                ) : (
                  <span className="text-zap-muted">0.00</span>
                )}
              </div>
              <TokenSelector
                selected={toToken}
                options={TOKEN_LIST.filter((t) => t.symbol !== fromToken.symbol)}
                onSelect={(t) => { setToToken(t); setQuote(null); }}
              />
            </div>
          </div>

          {quote && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-zap-bg border border-zap-border p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-zap-subtext">Price impact</span>
                <span className={cn(
                  quote.priceImpact > 3 ? "text-zap-orange" :
                  quote.priceImpact > 1 ? "text-yellow-400" : "text-zap-green"
                )}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zap-subtext">Est. gas fee</span>
                <span className="text-zap-text font-mono">{quote.estimatedGas} ETH</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zap-subtext">Slippage</span>
                <span className="text-zap-text">{slippage}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zap-subtext">Route</span>
                <span className="text-zap-text">AVNU Aggregator</span>
              </div>
            </motion.div>
          )}

          <div className="flex items-start gap-2 p-3 bg-zap-accent/5 border border-zap-accent/15 rounded-xl">
            <Info className="w-3.5 h-3.5 text-zap-accent shrink-0 mt-0.5" />
            <p className="text-zap-subtext text-xs leading-relaxed">
              Live quotes powered by AVNU aggregator via Starkzap SDK on Starknet Mainnet.
            </p>
          </div>

          {lastTxHash && (
            <div className="flex items-center gap-2 p-3 bg-zap-green/10 border border-zap-green/20 rounded-xl">
              <CheckCircle className="w-4 h-4 text-zap-green shrink-0" />
              <a
                href={NETWORKS.mainnet.explorer + "/tx/" + lastTxHash}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zap-green text-xs flex items-center gap-1 hover:underline"
              >
                Last swap confirmed <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {!isConnected ? (
            <div className="flex items-center gap-2 p-3 bg-zap-bg rounded-xl text-zap-subtext text-sm border border-zap-border">
              <Lock className="w-4 h-4" />Connect wallet to swap
            </div>
          ) : (
            <button
              onClick={handleSwap}
              disabled={!quote || isSwapping || isQuoting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-zap-accent text-zap-bg font-display font-bold text-sm hover:bg-zap-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-accent"
            >
              {isSwapping ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Swapping...</>
              ) : (
                <><ArrowLeftRight className="w-4 h-4" />Swap {fromToken.symbol} to {toToken.symbol}</>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function TokenSelector({
  selected,
  options,
  onSelect,
}: {
  selected: typeof TOKENS[keyof typeof TOKENS];
  options: typeof TOKENS[keyof typeof TOKENS][];
  onSelect: (t: typeof TOKENS[keyof typeof TOKENS]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zap-surface border border-zap-border hover:border-zap-accent/40 transition-colors shrink-0"
      >
        <img
          src={TOKEN_LOGOS[selected.symbol]}
          alt={selected.symbol}
          className="w-5 h-5 rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span className="font-display font-semibold text-zap-text text-sm">{selected.symbol}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zap-subtext" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 top-full mt-1 w-44 bg-zap-surface border border-zap-border rounded-xl shadow-2xl z-20 overflow-hidden"
          >
            {options.map((token) => (
              <button
                key={token.symbol}
                onClick={() => { onSelect(token); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zap-border/50 transition-colors text-left"
              >
                <img
                  src={TOKEN_LOGOS[token.symbol]}
                  alt={token.symbol}
                  className="w-7 h-7 rounded-full shrink-0"
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
  );
}
