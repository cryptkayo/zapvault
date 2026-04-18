"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown, Wallet, ArrowDownToLine, Send, X, Loader2, CheckCircle } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { TokenSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { cn, formatUsd, formatNumber } from "@/lib/utils";
import { TokenBalance } from "@/types";
import { toast } from "sonner";
import { addTransaction } from "@/hooks/useTransactions";

interface PortfolioTabProps {
  onNavigate: (tab: "deposit" | "trade") => void;
}

export function PortfolioTab({ onNavigate }: PortfolioTabProps) {
  const { address, wallet } = useWallet();
  const { balances, isLoading, totalUsd, refetch } = useTokenBalances(address, wallet);
  const [sendToken, setSendToken] = useState<TokenBalance | null>(null);
  const [recipient, setRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const hasAssets = balances.some((b) => b.usdValue > 0);

  const handleSend = async () => {
    if (!sendToken || !recipient || !sendAmount || !address || !wallet) return;
    if (!recipient.startsWith("0x") || recipient.length < 10) {
      toast.error("Invalid address", { description: "Please enter a valid Starknet address." });
      return;
    }
    setIsSending(true);
    try {
      const account = wallet.browserAccount;
      if (!account) throw new Error("No account available");

      const amountBig = BigInt(Math.floor(parseFloat(sendAmount) * (10 ** sendToken.decimals)));
      const amountLow = (amountBig & BigInt("0xffffffffffffffffffffffffffffffff")).toString();
      const amountHigh = (amountBig >> BigInt(128)).toString();

      console.log("Sending:", { token: sendToken.address, recipient, amountLow, amountHigh });

      const tx = await account.execute([{
        contractAddress: sendToken.address,
        entrypoint: "transfer",
        calldata: [recipient, amountLow, amountHigh],
      }]);

      setLastTxHash(tx.transaction_hash);
      addTransaction({
  hash: tx.transaction_hash,
  type: "transfer",
  label: `Send ${sendAmount} ${sendToken.symbol}`,
  color: "text-blue-400",
  status: "success",
  contractName: `${sendToken.symbol} Token`,
});
      toast.success("Transfer successful!", {
        description: "Sent " + sendAmount + " " + sendToken.symbol + " to " + recipient.slice(0, 8) + "...",
      });
      setSendToken(null);
      setRecipient("");
      setSendAmount("");
      refetch();
    } catch (err: any) {
      toast.error("Transfer failed", { description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-zap-surface border border-zap-border p-6"
      >
        <div className="absolute inset-0 bg-glow-accent pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-zap-subtext text-sm font-body mb-1">Total Portfolio Value</p>
            {isLoading ? (
              <Skeleton className="h-10 w-40 mt-1" />
            ) : (
              <h2 className="font-display text-4xl font-bold text-zap-text">{formatUsd(totalUsd)}</h2>
            )}
          </div>
          <button
            onClick={refetch}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-zap-border transition-colors text-zap-subtext hover:text-zap-text"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zap-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-zap-text text-sm">Assets</h3>
          <span className="text-zap-subtext text-xs">{balances.length} tokens</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-zap-border">
            {[...Array(4)].map((_, i) => <TokenSkeleton key={i} />)}
          </div>
        ) : balances.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zap-border/50 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-zap-muted" />
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-zap-text">No assets yet</p>
              <p className="text-zap-subtext text-sm mt-1">Bridge ETH from Ethereum to get started</p>
            </div>
            <button
              onClick={() => onNavigate("deposit")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zap-accent text-zap-bg text-sm font-display font-semibold hover:bg-zap-accent/90 transition-colors"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Bridge Assets
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zap-border">
            {balances.map((token, i) => (
              <motion.div
                key={token.symbol}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-4 py-4 hover:bg-zap-border/20 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden border border-zap-border">
                  <img
                    src={"https://assets.coingecko.com/coins/images/" + (
                      token.symbol === "ETH" ? "279/small/ethereum.png" :
                      token.symbol === "STRK" ? "26433/small/starknet.png" :
                      token.symbol === "USDC" ? "6319/small/usdc.png" :
                      "325/small/tether.png"
                    )}
                    alt={token.symbol}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = "none";
                      if (el.parentElement) {
                        el.parentElement.innerHTML = token.symbol.slice(0, 2);
                        el.parentElement.style.backgroundColor = token.color + "33";
                        el.parentElement.style.color = token.color;
                        el.parentElement.style.display = "flex";
                        el.parentElement.style.alignItems = "center";
                        el.parentElement.style.justifyContent = "center";
                        el.parentElement.style.fontWeight = "bold";
                        el.parentElement.style.fontSize = "12px";
                      }
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-zap-text text-sm">{token.symbol}</p>
                  <p className="text-zap-subtext text-xs">{token.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono text-zap-text text-sm">{formatNumber(token.formatted)} {token.symbol}</p>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      <span className="text-zap-subtext text-xs">{formatUsd(token.usdValue)}</span>
                      {token.change24h !== undefined && (
                        <span className={cn("text-xs flex items-center gap-0.5", token.change24h >= 0 ? "text-zap-green" : "text-zap-orange")}>
                          {token.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(token.change24h).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSendToken(token)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-zap-accent/10 border border-zap-accent/20 text-zap-accent hover:bg-zap-accent/20 transition-all"
                    title={"Send " + token.symbol}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {sendToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSendToken(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-sm bg-zap-surface border border-zap-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-zap-text text-lg">
                    Send {sendToken.symbol}
                  </h3>
                  <p className="text-zap-subtext text-xs mt-0.5">
                    Balance: {formatNumber(sendToken.formatted)} {sendToken.symbol}
                  </p>
                </div>
                <button
                  onClick={() => setSendToken(null)}
                  className="p-2 rounded-lg hover:bg-zap-border transition-colors text-zap-subtext hover:text-zap-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
                  <p className="text-zap-subtext text-xs mb-2">Amount</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-transparent font-mono text-2xl text-zap-text placeholder-zap-muted focus:outline-none min-w-0"
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: sendToken.color + "33", color: sendToken.color }}
                      >
                        {sendToken.symbol.slice(0, 1)}
                      </div>
                      <span className="font-display font-semibold text-zap-text text-sm">
                        {sendToken.symbol}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSendAmount(sendToken.formatted)}
                    className="mt-2 text-zap-accent text-xs hover:underline"
                  >
                    Max: {formatNumber(sendToken.formatted)}
                  </button>
                </div>

                <div className="rounded-xl bg-zap-bg border border-zap-border p-4">
                  <p className="text-zap-subtext text-xs mb-2">Recipient address</p>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-transparent font-mono text-sm text-zap-text placeholder-zap-muted focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-zap-accent/5 border border-zap-accent/15 rounded-xl">
                  <CheckCircle className="w-3.5 h-3.5 text-zap-accent shrink-0" />
                  <p className="text-zap-subtext text-xs">
                    Transfer powered by Starkzap SDK · Gasless via AVNU Paymaster
                  </p>
                </div>

                <button
                  onClick={handleSend}
                  disabled={isSending || !sendAmount || !recipient}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-zap-accent text-zap-bg font-display font-bold text-sm hover:bg-zap-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-accent"
                >
                  {isSending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" />Send {sendToken.symbol}</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasAssets && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => onNavigate("trade")}
            className="p-4 rounded-2xl bg-zap-surface border border-zap-border hover:border-zap-accent/40 transition-all text-left group"
          >
            <p className="font-display font-semibold text-zap-text text-sm group-hover:text-zap-accent transition-colors">Trade</p>
            <p className="text-zap-subtext text-xs mt-0.5">Swap tokens via AVNU</p>
          </button>
          <button
            onClick={() => onNavigate("deposit")}
            className="p-4 rounded-2xl bg-zap-surface border border-zap-border hover:border-zap-green/40 transition-all text-left group"
          >
            <p className="font-display font-semibold text-zap-text text-sm group-hover:text-zap-green transition-colors">Deposit</p>
            <p className="text-zap-subtext text-xs mt-0.5">Bridge from Ethereum</p>
          </button>
        </motion.div>
      )}
    </div>
  );
}