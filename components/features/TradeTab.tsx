"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, ChevronDown, Loader2, CheckCircle, Lock, ExternalLink, Settings, Zap } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { TOKENS, NETWORKS } from "@/lib/sdk";
import { useSwap } from "@/hooks/useSwap";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

const TOKEN_LOGOS: Record<string, string> = {
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  STRK: "https://assets.coingecko.com/coins/images/26433/small/starknet.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/tether.png",
};

const TOKEN_LIST = Object.values(TOKENS);
type TokenType = typeof TOKENS[keyof typeof TOKENS];

export function TradeTab() {
  const { address, isConnected, wallet } = useWallet();
  const { balances } = useTokenBalances(address, wallet);
  const { quote, quoteAge, isQuoting, isSwapping, error: swapError, lastTxHash, getQuote, executeSwap, clearQuote } = useSwap(address, wallet);

  const [fromToken, setFromToken] = useState<TokenType>(TOKENS.ETH);
  const [toToken, setToToken] = useState<TokenType>(TOKENS.STRK);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState(2.0);
  const [showSettings, setShowSettings] = useState(false);
  const isSubmittingRef = useRef(false);

  // Get balance for selected from token
  const fromBalance = balances.find((b) => b.symbol === fromToken.symbol);
  const fromBalanceFormatted = fromBalance?.formatted ?? "0";

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (value && parseFloat(value) > 0) {
      getQuote(fromToken.address, toToken.address, value);
    } else {
      getQuote(fromToken.address, toToken.address, "0");
    }
  };

  const handleMax = () => {
    if (!fromBalance) return;
    const maxAmount = fromBalance.formatted;
    setFromAmount(maxAmount);
    getQuote(fromToken.address, toToken.address, maxAmount);
  };

  const handleFlip = () => {
    const temp = fromToken;
    setFromToken(toToken as TokenType);
    setToToken(temp as TokenType);
    setFromAmount(quote?.toAmount ?? "");
    if (quote?.toAmount) {
      getQuote(toToken.address, fromToken.address, quote.toAmount);
    }
  };

  const handleSwap = async () => {
    if (!quote || !address || !fromAmount) return;
    if (isSubmittingRef.current) return; // prevent double execution
    isSubmittingRef.current = true;
    // Always build quote from current form state to prevent stale token pair
    const currentQuote = { 
      ...quote, 
      fromToken: fromToken.address, 
      toToken: toToken.address, 
      fromAmount,
    };
    console.log("HANDLE SWAP:", fromToken.symbol, "->", toToken.symbol, fromAmount);
    try {
      const hash = await executeSwap(currentQuote, slippage);
      setFromAmount("");
      // Show persistent success toast with explorer link
      toast.success("Swap successful! 🎉", {
        description: hash
          ? `View on Voyager: voyager.online/tx/${hash.slice(0, 10)}...`
          : "Transaction submitted",
        duration: 8000,
        action: hash ? {
          label: "View Tx",
          onClick: () => window.open(`https://voyager.online/tx/${hash}`, "_blank"),
        } : undefined,
      });
    } catch (err: any) {
      if (!err.message?.includes("User abort") && !err.message?.includes("user rejected")) {
        toast.error("Swap failed", {
          description: err.message,
          duration: 6000,
        });
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zap-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-zap-text">Swap Tokens</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zap-green/15 border border-zap-green/30 text-zap-green text-xs font-display font-semibold">
                <Zap className="w-3 h-3" />
                Low Fees
              </span>
            </div>
            <p className="text-zap-subtext text-xs mt-0.5">Powered by AVNU · via Starkzap SDK</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showSettings ? "bg-zap-accent/10 text-zap-accent" : "hover:bg-zap-border text-zap-subtext hover:text-zap-text"
            )}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Settings */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-5 py-3 bg-zap-bg border-b border-zap-border"
          >
            <p className="text-zap-subtext text-xs mb-2">Slippage tolerance</p>
            <div className="flex gap-2">
              {[0.5, 1.0, 2.0, 5.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors",
                    slippage === s ? "bg-zap-accent text-zap-bg" : "bg-zap-border text-zap-subtext hover:text-zap-text"
                  )}
                >
                  {s}%
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="p-5 space-y-2">
          {/* From token */}
          <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zap-subtext text-xs">You pay</p>
              {fromBalance && (
                <button
                  onClick={handleMax}
                  className="flex items-center gap-1 text-xs text-zap-subtext hover:text-zap-accent transition-colors"
                >
                  Balance: <span className="font-mono text-zap-text">{formatNumber(fromBalanceFormatted)}</span>
                  <span className="text-zap-accent font-semibold ml-1">MAX</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                placeholder="0.00"
                disabled={!isConnected}
                className="flex-1 bg-transparent font-mono text-2xl text-zap-text placeholder-zap-muted focus:outline-none min-w-0 disabled:opacity-50"
              />
              <TokenSelector
                selected={fromToken}
                options={TOKEN_LIST.filter((t) => t.symbol !== toToken.symbol)}
                onSelect={(t) => {
                  setFromToken(t as TokenType);
                  setFromAmount("");
                  clearQuote();
                }}
              />
            </div>
          </div>

          {/* Flip button */}
          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              className="p-2.5 rounded-xl bg-zap-surface border border-zap-border hover:border-zap-accent/50 hover:bg-zap-accent/5 transition-all text-zap-subtext hover:text-zap-accent group"
            >
              <ArrowLeftRight className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>

          {/* To token */}
          <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zap-subtext text-xs">You receive</p>
              {isQuoting ? (
                <span className="flex items-center gap-1 text-zap-subtext text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Refreshing quote...
                </span>
              ) : quote && (
                <span className={"text-xs font-mono " + (quoteAge > 20 ? "text-orange-400" : "text-zap-muted")}>
                  {quoteAge > 0 ? quoteAge + "s ago" : "fresh"}
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
                onSelect={(t) => {
                  setToToken(t as TokenType);
                  setFromAmount("");
                  clearQuote();
                }}
              />
            </div>
          </div>

          {/* Quote details */}
          {quote && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-zap-bg border border-zap-border p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-zap-subtext">Price impact</span>
                <span className={cn(
                  "font-mono",
                  quote.priceImpact > 10 ? "text-red-400" :
                  quote.priceImpact > 3 ? "text-orange-400" : "text-zap-green"
                )}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zap-subtext">Network fee</span>
                <span className="flex items-center gap-1 text-zap-green font-semibold">
                  <Zap className="w-3 h-3" />
                  &lt;$0.01
                </span>
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

          {/* Quote/swap error */}
          {swapError && !isQuoting && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs">{swapError}</p>
              </div>
              {(swapError.includes("Slippage") || swapError.includes("slippage") || swapError.includes("Insufficient")) && (
                <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-yellow-400 text-xs">Try increasing slippage:</p>
                  <div className="flex gap-1">
                    {[3, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setSlippage(s); setShowSettings(true); }}
                        className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-bold hover:bg-yellow-500/30 transition-colors"
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!quote && !isQuoting && !swapError && fromAmount && parseFloat(fromAmount) > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-400 text-xs">No route found. Try a larger amount — minimum ~1 STRK or 0.001 ETH.</p>
            </div>
          )}

          {/* Success state */}
          {lastTxHash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-zap-green/10 border border-zap-green/30 p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-zap-green/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-zap-green" />
                </div>
                <div>
                  <p className="font-display font-bold text-zap-green text-sm">Swap Successful!</p>
                  <p className="text-zap-subtext text-xs">Your tokens have been swapped</p>
                </div>
              </div>
              <a
                href={`${NETWORKS.mainnet.explorer}/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-zap-green/10 hover:bg-zap-green/20 transition-colors"
              >
                <span className="text-zap-green text-xs font-mono">{lastTxHash.slice(0, 12)}...{lastTxHash.slice(-6)}</span>
                <span className="flex items-center gap-1 text-zap-green text-xs font-semibold">
                  View on Voyager <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </motion.div>
          )}

          {/* Action button */}
          {!isConnected ? (
            <div className="flex items-center gap-2 p-3 bg-zap-bg rounded-xl text-zap-subtext text-sm border border-zap-border">
              <Lock className="w-4 h-4" />Connect wallet to swap
            </div>
          ) : (
            <button
              onClick={handleSwap}
              disabled={!quote || isSwapping || isQuoting || !fromAmount}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-zap-accent text-zap-bg font-display font-bold text-sm hover:bg-zap-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-accent"
            >
              {isSwapping ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Swapping...</>
              ) : (
                <><ArrowLeftRight className="w-4 h-4" />Swap {fromToken.symbol} → {toToken.symbol}</>
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
  selected: TokenType;
  options: TokenType[];
  onSelect: (t: TokenType) => void;
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