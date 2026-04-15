"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Plus, Minus, Gift, CheckCircle, Loader2, Lock } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useStaking } from "@/hooks/useStaking";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

export function EarnTab() {
  const { address, isConnected, wallet } = useWallet();
const { pools, myPositions, isLoading, isTxPending, stake, claimRewards, unstake } = useStaking(address, wallet);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [activeAction, setActiveAction] = useState<"stake" | "unstake">("stake");

  const handleStake = async () => {
    if (!selectedPool || !stakeAmount) return;
    try {
      const hash = await stake(selectedPool, stakeAmount);
      toast.success("Staked successfully!", { description: "Tx: " + hash?.slice(0, 10) + "..." });
      setStakeAmount("");
    } catch (err: any) {
      toast.error("Stake failed", { description: err.message });
    }
  };

  const handleClaim = async (poolId: string) => {
    try {
      const hash = await claimRewards(poolId);
      toast.success("Rewards claimed!", { description: "Tx: " + hash?.slice(0, 10) + "..." });
    } catch (err: any) {
      toast.error("Claim failed", { description: err.message });
    }
  };

  const handleUnstake = async () => {
    if (!selectedPool || !unstakeAmount) return;
    try {
      const hash = await unstake(selectedPool, unstakeAmount);
      toast.success("Unstaked successfully!", { description: "Tx: " + hash?.slice(0, 10) + "..." });
      setUnstakeAmount("");
    } catch (err: any) {
      toast.error("Unstake failed", { description: err.message });
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-zap-surface border border-zap-border p-6"
      >
        <div className="absolute inset-0 bg-glow-green pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-zap-subtext text-sm">Earn passive income</p>
            <h2 className="font-display text-2xl font-bold text-zap-text mt-1">Stake STRK</h2>
            <p className="text-zap-subtext text-sm mt-1">Delegate to validators and earn rewards automatically</p>
          </div>
          <div className="text-right">
            <p className="text-zap-subtext text-xs">Best APY</p>
            {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <p className="font-display text-3xl font-bold text-zap-green">{pools[0]?.apy?.toFixed(1) ?? "---"}%</p>
            )}
          </div>
        </div>
      </motion.div>

      {myPositions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zap-border">
            <h3 className="font-display font-semibold text-zap-text text-sm">My Positions</h3>
          </div>
          <div className="divide-y divide-zap-border">
            {myPositions.map((pos) => (
              <div key={pos.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-display font-semibold text-zap-text text-sm">{pos.name}</p>
                  <p className="text-zap-subtext text-xs mt-0.5">Staked: {formatNumber(pos.myStaked)} STRK</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-zap-green text-sm font-mono">+{formatNumber(pos.myRewards)} STRK</p>
                    <p className="text-zap-subtext text-xs">rewards</p>
                  </div>
                  <button
                    onClick={() => handleClaim(pos.id)}
                    disabled={isTxPending || parseFloat(pos.myRewards) === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zap-green/10 border border-zap-green/20 text-zap-green text-xs font-display font-semibold hover:bg-zap-green/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Gift className="w-3 h-3" />
                    Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-zap-surface border border-zap-border overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zap-border">
          <h3 className="font-display font-semibold text-zap-text text-sm">Validator Pools</h3>
        </div>
        {isLoading ? (
          <div className="divide-y divide-zap-border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : pools.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <TrendingUp className="w-8 h-8 text-zap-muted" />
            <p className="text-zap-subtext text-sm">No pools available</p>
          </div>
        ) : (
          <div className="divide-y divide-zap-border">
            {pools.map((pool, i) => (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  selectedPool === pool.id ? "bg-zap-accent/5 border-l-2 border-l-zap-accent" : "hover:bg-zap-border/20"
                )}
                onClick={() => setSelectedPool(selectedPool === pool.id ? null : pool.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-semibold text-zap-text text-sm">{pool.name}</p>
                    <p className="text-zap-subtext text-xs font-mono mt-0.5">{pool.validator.slice(0, 10)}...{pool.validator.slice(-6)}</p>
                    <p className="text-zap-subtext text-xs mt-1">Total staked: {Number(pool.totalStaked).toLocaleString()} STRK</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-zap-green">{pool.apy.toFixed(1)}%</p>
                    <p className="text-zap-subtext text-xs">APY</p>
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-zap-green/10 text-zap-green text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-zap-green" />Active
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedPool && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl bg-zap-surface border border-zap-accent/30 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex gap-1 p-1 bg-zap-bg rounded-xl mb-4">
                {(["stake", "unstake"] as const).map((action) => (
                  <button
                    key={action}
                    onClick={() => setActiveAction(action)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-display font-semibold transition-all",
                      activeAction === action ? "bg-zap-surface text-zap-text" : "text-zap-subtext hover:text-zap-text"
                    )}
                  >
                    {action === "stake" ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                ))}
              </div>

              <div className="relative mb-3">
                <input
                  type="number"
                  value={activeAction === "stake" ? stakeAmount : unstakeAmount}
                  onChange={(e) => activeAction === "stake" ? setStakeAmount(e.target.value) : setUnstakeAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={!isConnected}
                  className="w-full bg-zap-bg border border-zap-border rounded-xl px-4 py-3 font-mono text-lg text-zap-text placeholder-zap-muted focus:outline-none focus:border-zap-accent/60 disabled:opacity-50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zap-subtext font-display font-semibold text-sm">STRK</span>
              </div>

              {!isConnected ? (
                <div className="flex items-center gap-2 p-3 bg-zap-bg rounded-xl text-zap-subtext text-sm border border-zap-border">
                  <Lock className="w-4 h-4" />Connect wallet to stake
                </div>
              ) : (
                <button
                  onClick={activeAction === "stake" ? handleStake : handleUnstake}
                  disabled={isTxPending || !(activeAction === "stake" ? stakeAmount : unstakeAmount)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zap-green text-zap-bg font-display font-bold text-sm hover:bg-zap-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTxPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" />{activeAction === "stake" ? "Stake STRK" : "Unstake STRK"}</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
