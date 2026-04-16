"use client";

import { useState, useEffect, useCallback } from "react";
import { StakingPool } from "@/types";
import { sdk } from "@/lib/sdk";
import { mainnetValidators } from "starkzap";

// ✅ CORRECT staker addresses from mainnetValidators SDK presets
// These are STAKER addresses — the SDK resolves pool contract addresses from these at runtime
const POOLS_CONFIG = [
  {
    key: "READY_PREV_ARGENT" as const,
    name: "Ready (Argent)",
    apy: 7.5,
    stakerAddress: mainnetValidators.READY_PREV_ARGENT.stakerAddress,
  },
  {
    key: "BRAAVOS" as const,
    name: "Braavos",
    apy: 7.5,
    stakerAddress: mainnetValidators.BRAAVOS.stakerAddress,
  },
  {
    key: "AVNU" as const,
    name: "AVNU",
    apy: 7.5,
    stakerAddress: mainnetValidators.AVNU.stakerAddress,
  },
];

const STRK_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export function useStaking(address: string | null, wallet: any | null) {
  const [pools, setPools] = useState<StakingPool[]>([]);
  // Map from stakerAddress -> live pool contract address
  const [poolContracts, setPoolContracts] = useState<Record<string, string>>({});
  const [myPositions, setMyPositions] = useState<StakingPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTxPending, setIsTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const resolvedPools: StakingPool[] = [];
    const resolvedContracts: Record<string, string> = {};

    for (const config of POOLS_CONFIG) {
      try {
        // SDK fetches the live pool contract address from the staking contract on-chain
        const stakerPools = await sdk.getStakerPools(config.stakerAddress);

        // Find the STRK pool specifically
        const strkPool = stakerPools.find(
          (p: any) =>
            p.token?.symbol === "STRK" ||
            p.token?.address
              ?.toLowerCase()
              .includes("4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d")
        );

        const poolContractAddress = strkPool?.poolContract ?? config.stakerAddress;
        resolvedContracts[config.stakerAddress] = poolContractAddress;

        resolvedPools.push({
          id: poolContractAddress,           // ← live pool contract address
          name: config.name,
          validator: config.stakerAddress,   // ← staker address (for display)
          apy: config.apy,
          totalStaked: strkPool?.amount?.toString() ?? "0",
          myStaked: "0",
          myRewards: "0",
          status: "active",
        });
      } catch (e: any) {
        console.warn(`Failed to resolve pool for ${config.name}:`, e.message);
        // Fallback: use staker address directly so the UI still shows
        resolvedContracts[config.stakerAddress] = config.stakerAddress;
        resolvedPools.push({
          id: config.stakerAddress,
          name: config.name,
          validator: config.stakerAddress,
          apy: config.apy,
          totalStaked: "0",
          myStaked: "0",
          myRewards: "0",
          status: "active",
        });
      }
    }

    setPools(resolvedPools);
    setPoolContracts(resolvedContracts);
    setIsLoading(false);
  }, []);

  const stake = useCallback(
    async (poolId: string, amount: string) => {
      if (!address || !wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      setIsTxPending(true);
      try {
        const amountBig = BigInt(Math.floor(parseFloat(amount) * 1e18));
        const amountLow = (
          amountBig & BigInt("0xffffffffffffffffffffffffffffffff")
        ).toString();
        const amountHigh = (amountBig >> BigInt(128)).toString();

        console.log("Staking:", { poolId, amount, amountLow, amountHigh });

        const tx = await account.execute([
          {
            contractAddress: STRK_ADDRESS,
            entrypoint: "approve",
            calldata: [poolId, amountLow, amountHigh],
          },
          {
            contractAddress: poolId,
            entrypoint: "enter_delegation_pool",
            calldata: [address, amountLow, amountHigh],
          },
        ]);

        await new Promise((res) => setTimeout(res, 3000));
        await fetchPools();
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, fetchPools]
  );

  const claimRewards = useCallback(
    async (poolId: string) => {
      if (!address || !wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      setIsTxPending(true);
      try {
        const tx = await account.execute([
          {
            contractAddress: poolId,
            entrypoint: "claim_rewards",
            calldata: [address],
          },
        ]);
        await new Promise((res) => setTimeout(res, 3000));
        await fetchPools();
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, fetchPools]
  );

  const unstake = useCallback(
    async (poolId: string, amount: string) => {
      if (!address || !wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      setIsTxPending(true);
      try {
        const amountBig = BigInt(Math.floor(parseFloat(amount) * 1e18));
        const amountLow = (
          amountBig & BigInt("0xffffffffffffffffffffffffffffffff")
        ).toString();
        const amountHigh = (amountBig >> BigInt(128)).toString();

        const tx = await account.execute([
          {
            contractAddress: poolId,
            entrypoint: "exit_delegation_pool_intent",
            calldata: [amountLow, amountHigh],
          },
        ]);
        await new Promise((res) => setTimeout(res, 3000));
        await fetchPools();
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, fetchPools]
  );

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return {
    pools,
    myPositions,
    isLoading,
    isTxPending,
    error,
    stake,
    claimRewards,
    unstake,
    refetch: fetchPools,
  };
}