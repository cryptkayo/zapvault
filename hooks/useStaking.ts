"use client";

import { useState, useEffect, useCallback } from "react";
import { StakingPool } from "@/types";

const STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

const POOLS: StakingPool[] = [
  {
    id: "0x02cb02c72e8a0975e69e88298443e984d965a49eab38f5bdde1f5072daa09cfe",
    name: "Ready (Argent)",
    validator: "0x02cb02c72e8a0975e69e88298443e984d965a49eab38f5bdde1f5072daa09cfe",
    apy: 7.5,
    totalStaked: "144570000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x01f170bafce432964d6cbaf2cb75355b2043f5640897e0623b7dbb029bf6b3ef",
    name: "Braavos",
    validator: "0x01f170bafce432964d6cbaf2cb75355b2043f5640897e0623b7dbb029bf6b3ef",
    apy: 7.5,
    totalStaked: "97230000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x0362dc7da60bfddc8e3146028dfd94941c6e22403c98b5947104e637543b475d",
    name: "AVNU",
    validator: "0x0362dc7da60bfddc8e3146028dfd94941c6e22403c98b5947104e637543b475d",
    apy: 7.5,
    totalStaked: "107700000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
];

export function useStaking(address: string | null, wallet: any | null) {
  const [pools, setPools] = useState<StakingPool[]>(POOLS);
  const [myPositions, setMyPositions] = useState<StakingPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTxPending, setIsTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    setPools(POOLS);
  }, []);

  const stake = useCallback(async (poolId: string, amount: string) => {
    if (!address || !wallet) throw new Error("Wallet not connected");
    const account = wallet.browserAccount || wallet.getAccount?.();
    if (!account) throw new Error("No account available");

    setIsTxPending(true);
    try {
      const amountBig = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const amountLow = (amountBig & BigInt("0xffffffffffffffffffffffffffffffff")).toString();
      const amountHigh = (amountBig >> BigInt(128)).toString();

      console.log("Staking to pool:", poolId, "Amount:", amount, "Low:", amountLow, "High:", amountHigh);

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
  }, [address, wallet, fetchPools]);

  const claimRewards = useCallback(async (poolId: string) => {
    if (!address || !wallet) throw new Error("Wallet not connected");
    const account = wallet.browserAccount || wallet.getAccount?.();
    if (!account) throw new Error("No account available");

    setIsTxPending(true);
    try {
      const tx = await account.execute([{
        contractAddress: poolId,
        entrypoint: "claim_rewards",
        calldata: [address],
      }]);

      await new Promise((res) => setTimeout(res, 3000));
      await fetchPools();
      return tx.transaction_hash;
    } finally {
      setIsTxPending(false);
    }
  }, [address, wallet, fetchPools]);

  const unstake = useCallback(async (poolId: string, amount: string) => {
    if (!address || !wallet) throw new Error("Wallet not connected");
    const account = wallet.browserAccount || wallet.getAccount?.();
    if (!account) throw new Error("No account available");

    setIsTxPending(true);
    try {
      const amountBig = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const amountLow = (amountBig & BigInt("0xffffffffffffffffffffffffffffffff")).toString();
      const amountHigh = (amountBig >> BigInt(128)).toString();

      const tx = await account.execute([{
        contractAddress: poolId,
        entrypoint: "exit_delegation_pool_intent",
        calldata: [amountLow, amountHigh],
      }]);

      await new Promise((res) => setTimeout(res, 3000));
      await fetchPools();
      return tx.transaction_hash;
    } finally {
      setIsTxPending(false);
    }
  }, [address, wallet, fetchPools]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return { pools, myPositions, isLoading, isTxPending, error, stake, claimRewards, unstake, refetch: fetchPools };
}