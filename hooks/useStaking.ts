"use client";

import { useState, useEffect, useCallback } from "react";
import { StakingPool } from "@/types";

const STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

const POOLS: StakingPool[] = [
  {
    id: "0x00d3b910d8c528bf0216866053c3821ac6c97983dc096bff642e9a3549210ee7",
    name: "Ready (Argent)",
    validator: "0x00d3b910d8c528bf0216866053c3821ac6c97983dc096bff642e9a3549210ee7",
    apy: 7.8,
    totalStaked: "142500000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x04b00f97e2d2168b91fe64ceeace4a41fc274a85bbdd0adc402c3d0cf9f91bbb",
    name: "Braavos",
    validator: "0x04b00f97e2d2168b91fe64ceeace4a41fc274a85bbdd0adc402c3d0cf9f91bbb",
    apy: 6.9,
    totalStaked: "89200000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x036963c7b56f08105ffdd7f12560924bdc0cb29ce210417ecbc8bf3c7e4b9090",
    name: "AVNU",
    validator: "0x036963c7b56f08105ffdd7f12560924bdc0cb29ce210417ecbc8bf3c7e4b9090",
    apy: 7.2,
    totalStaked: "95000000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x072543946080646d1aac08bb4ba6f6531b2b29ce41ebfe72b8a6506500d5220e",
    name: "Karnot",
    validator: "0x072543946080646d1aac08bb4ba6f6531b2b29ce41ebfe72b8a6506500d5220e",
    apy: 6.5,
    totalStaked: "67800000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x01aca15766cb615c3b7ca0fc3680cbde8b21934bb2e7b41594b9d046d7412c00",
    name: "Twinstake",
    validator: "0x01aca15766cb615c3b7ca0fc3680cbde8b21934bb2e7b41594b9d046d7412c00",
    apy: 6.2,
    totalStaked: "54000000",
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
  calldata: [amountLow, amountHigh],
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