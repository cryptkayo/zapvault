"use client";

import { useState, useEffect, useCallback } from "react";
import { sdk } from "@/lib/sdk";
import { StakingPool } from "@/types";

const FALLBACK_POOLS: StakingPool[] = [
  {
    id: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    name: "Starknet Foundation",
    validator: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    apy: 7.8,
    totalStaked: "142500000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    name: "Braavos Validator",
    validator: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    apy: 6.9,
    totalStaked: "89200000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
    name: "Argent Validator",
    validator: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
    apy: 6.4,
    totalStaked: "67800000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
];

export function useStaking(address: string | null) {
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [myPositions, setMyPositions] = useState<StakingPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTxPending, setIsTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    setIsLoading(true);
    try {
      const availablePools = await sdk.staking.getPools();

      if (availablePools && availablePools.length > 0) {
        const formatted: StakingPool[] = availablePools.map((pool: any) => ({
          id: pool.id ?? pool.address,
          name: pool.name ?? "Starknet Validator",
          validator: pool.validatorAddress ?? pool.address,
          apy: parseFloat(pool.apy ?? "5.2"),
          totalStaked: pool.totalStaked ?? "0",
          myStaked: "0",
          myRewards: "0",
          status: pool.isActive ? "active" : "inactive",
        }));
        setPools(formatted);
      } else {
        setPools(FALLBACK_POOLS);
      }

      if (address) {
        const positions = await sdk.staking.getPositions({ address });
        if (positions && positions.length > 0) {
          const userPositions: StakingPool[] = positions.map((pos: any) => ({
            id: pos.poolId ?? pos.validatorAddress,
            name: pos.poolName ?? "Starknet Validator",
            validator: pos.validatorAddress,
            apy: parseFloat(pos.apy ?? "5.2"),
            totalStaked: pos.poolTotalStaked ?? "0",
            myStaked: pos.stakedAmount ?? "0",
            myRewards: pos.pendingRewards ?? "0",
            status: "active" as const,
          }));
          setMyPositions(userPositions);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setPools(FALLBACK_POOLS);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const stake = useCallback(async (poolId: string, amount: string) => {
    if (!address) throw new Error("Wallet not connected");
    setIsTxPending(true);
    try {
      const tx = await sdk.staking.stake({ poolId, amount, address });
      await tx.wait();
      await fetchPools();
      return tx.hash;
    } finally {
      setIsTxPending(false);
    }
  }, [address, fetchPools]);

  const claimRewards = useCallback(async (poolId: string) => {
    if (!address) throw new Error("Wallet not connected");
    setIsTxPending(true);
    try {
      const tx = await sdk.staking.claimRewards({ poolId, address });
      await tx.wait();
      await fetchPools();
      return tx.hash;
    } finally {
      setIsTxPending(false);
    }
  }, [address, fetchPools]);

  const unstake = useCallback(async (poolId: string, amount: string) => {
    if (!address) throw new Error("Wallet not connected");
    setIsTxPending(true);
    try {
      const tx = await sdk.staking.unstake({ poolId, amount, address });
      await tx.wait();
      await fetchPools();
      return tx.hash;
    } finally {
      setIsTxPending(false);
    }
  }, [address, fetchPools]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return { pools, myPositions, isLoading, isTxPending, error, stake, claimRewards, unstake, refetch: fetchPools };
}