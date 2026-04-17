"use client";

import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, ArrowUpRight, ArrowDownLeft, Repeat2, Zap, Gift, Link, Clock } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useTransactions } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, any> = {
  transfer: ArrowUpRight,
  stake: Zap,
  unstake: ArrowDownLeft,
  swap: Repeat2,
  bridge: Link,
  rewards: Gift,
  approve: Clock,
  contract: ExternalLink,
};

function formatTimestamp(ts: number) {
  if (!ts) return "—";
  const date = new Date(ts * 1000);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortHash(hash: string) {
  if (!hash) return "—";
  return hash.slice(0, 8) + "..." + hash.slice(-6);
}

export function ActivityTab() {
  const { address, isConnected } = useWallet();
  const { transactions, isLoading, error, refetch } = useTransactions(address);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-zap-surface border border-zap-border flex items-center justify-center">
          <Clock className="w-6 h-6 text-zap-muted" />
        </div>
        <p className="text-zap-subtext text-sm">Connect your wallet to view activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-zap-surface border border-zap-border p-6"
      >
        <div className="absolute inset-0 bg-glow-blue pointer-events-none opacity-50" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-zap-subtext text-sm">On-chain history</p>
            <h2 className="font-display text-2xl font-bold text-zap-text mt-1">Activity</h2>
            <p className="text-zap-subtext text-sm mt-1">
              Stakes, transfers, swaps, and bridges
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-zap-bg border border-zap-border text-zap-subtext hover:text-zap-text hover:border-zap-accent/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      {/* Transaction List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
      >
        {isLoading ? (
          <div className="divide-y divide-zap-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <p className="text-zap-subtext text-sm">Failed to load transactions</p>
            <button
              onClick={refetch}
              className="text-zap-accent text-sm hover:underline"
            >
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zap-bg border border-zap-border flex items-center justify-center">
              <Clock className="w-5 h-5 text-zap-muted" />
            </div>
            <p className="text-zap-text font-display font-semibold text-sm">No transactions yet</p>
            <p className="text-zap-subtext text-xs">
              Your stakes, transfers, and swaps will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zap-border">
            {transactions.map((tx, i) => {
              const Icon = TYPE_ICONS[tx.type] ?? ExternalLink;
              return (
                <motion.div
                  key={tx.hash + i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-zap-border/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon */}
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      tx.type === "stake" && "bg-green-500/10",
                      tx.type === "unstake" && "bg-orange-500/10",
                      tx.type === "transfer" && "bg-blue-500/10",
                      tx.type === "swap" && "bg-cyan-500/10",
                      tx.type === "bridge" && "bg-pink-500/10",
                      tx.type === "rewards" && "bg-purple-500/10",
                      !["stake","unstake","transfer","swap","bridge","rewards"].includes(tx.type) && "bg-zap-bg",
                    )}>
                      <Icon className={cn("w-4 h-4", tx.color)} />
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-display font-semibold text-sm", tx.color)}>
                          {tx.label}
                        </p>
                        {tx.status === "failed" && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs">
                            Failed
                          </span>
                        )}
                      </div>
                      <p className="text-zap-subtext text-xs font-mono truncate">
                        {shortHash(tx.hash)}
                      </p>
                      {tx.contractName && (
                        <p className="text-zap-muted text-xs mt-0.5">{tx.contractName}</p>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-zap-subtext text-xs text-right">
                      {formatTimestamp(tx.timestamp)}
                    </p>
                    <a
                      href={tx.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-zap-border/30 text-zap-muted hover:text-zap-text transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Footer note */}
      {transactions.length > 0 && (
        <p className="text-center text-zap-muted text-xs">
          Showing recent transactions · View full history on{" "}
          <a
            href={`https://voyager.online/contract/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zap-accent hover:underline"
          >
            Voyager
          </a>
        </p>
      )}
    </div>
  );
}