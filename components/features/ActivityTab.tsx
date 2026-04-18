"use client";

import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, ArrowUpRight, ArrowDownLeft, Repeat2, Zap, Gift, Clock, Trash2 } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useTransactions } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, any> = {
  transfer: ArrowUpRight,
  receive: ArrowDownLeft,
  stake: Zap,
  unstake: ArrowDownLeft,
  swap: Repeat2,
  rewards: Gift,
  contract: ExternalLink,
};

function formatTimestamp(ts: number) {
  if (!ts) return "—";
  const date = new Date(ts);
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
  const { transactions, refetch, clearTransactions } = useTransactions(address);

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
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-zap-subtext text-sm">In-app history</p>
            <h2 className="font-display text-2xl font-bold text-zap-text mt-1">Activity</h2>
            <p className="text-zap-subtext text-sm mt-1">
              Your stakes, swaps and transfers via ZapVault
            </p>
          </div>
          <div className="flex gap-2">
            {transactions.length > 0 && (
              <button
                onClick={clearTransactions}
                className="p-2.5 rounded-xl bg-zap-bg border border-zap-border text-zap-subtext hover:text-red-400 hover:border-red-400/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={refetch}
              className="p-2.5 rounded-xl bg-zap-bg border border-zap-border text-zap-subtext hover:text-zap-text transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Transaction list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
      >
        {transactions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zap-bg border border-zap-border flex items-center justify-center">
              <Clock className="w-5 h-5 text-zap-muted" />
            </div>
            <p className="text-zap-text font-display font-semibold text-sm">No activity yet</p>
            <p className="text-zap-subtext text-xs text-center max-w-48">
              Your stakes, swaps and transfers will appear here as you use ZapVault
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
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-zap-bg",
                    )}>
                      <Icon className={cn("w-4 h-4", tx.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("font-display font-semibold text-sm", tx.color)}>
                        {tx.label}
                      </p>
                      <p className="text-zap-subtext text-xs font-mono">
                        {shortHash(tx.hash)}
                      </p>
                      <p className="text-zap-muted text-xs">{tx.contractName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-zap-subtext text-xs text-right">
                      {formatTimestamp(tx.timestamp)}
                    </p>
                    <a
                      href={tx.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-zap-border/30 text-zap-muted hover:text-zap-text transition-colors"
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

      {transactions.length > 0 && (
        <p className="text-center text-zap-muted text-xs">
          Showing transactions made via ZapVault · View on{" "}
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