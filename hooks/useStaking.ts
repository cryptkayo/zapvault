"use client";

import { useState, useEffect, useCallback } from "react";
import { StakingPool } from "@/types";

const STAKING_CONTRACT = "0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7";
const STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const RPC_URL = "https://starknet-mainnet.public.blastapi.io";

// Known validators with their staker addresses
const KNOWN_VALIDATORS = [
  {
    name: "Starknet Foundation",
    stakerAddress: "0x01bf4c6d60b8e97e3eb0a0a33f6b65cd09a7bd69d1e7b28b7dd4df4a42584b40",
  },
  {
    name: "Braavos",
    stakerAddress: "0x0533cbf3fb8d3e5b92f86ee22e9b2af87fa98af2d685978c0a9ba3c6b7cdceec",
  },
  {
    name: "Argent",
    stakerAddress: "0x03c3df3ec0ae2ba6dfc9d3e8cd66f3e52b2a6d7b9e8e6ca3b6a1bc14d5e6c0aa",
  },
];

const FALLBACK_POOLS: StakingPool[] = [
  {
    id: "0x01bf4c6d60b8e97e3eb0a0a33f6b65cd09a7bd69d1e7b28b7dd4df4a42584b40",
    name: "Starknet Foundation",
    validator: "0x01bf4c6d60b8e97e3eb0a0a33f6b65cd09a7bd69d1e7b28b7dd4df4a42584b40",
    apy: 7.8,
    totalStaked: "142500000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x0533cbf3fb8d3e5b92f86ee22e9b2af87fa98af2d685978c0a9ba3c6b7cdceec",
    name: "Braavos",
    validator: "0x0533cbf3fb8d3e5b92f86ee22e9b2af87fa98af2d685978c0a9ba3c6b7cdceec",
    apy: 6.9,
    totalStaked: "89200000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
  {
    id: "0x03c3df3ec0ae2ba6dfc9d3e8cd66f3e52b2a6d7b9e8e6ca3b6a1bc14d5e6c0aa",
    name: "Argent",
    validator: "0x03c3df3ec0ae2ba6dfc9d3e8cd66f3e52b2a6d7b9e8e6ca3b6a1bc14d5e6c0aa",
    apy: 6.4,
    totalStaked: "67800000",
    myStaked: "0",
    myRewards: "0",
    status: "active",
  },
];

async function rpcCall(method: string, params: any[]): Promise<any> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const data = await res.json();
  return data.result;
}

async function getPoolAddress(stakerAddress: string): Promise<string | null> {
  try {
    const result = await rpcCall("starknet_call", [
      {
        contract_address: STAKING_CONTRACT,
        entry_point_selector: "0x2a5c844e3cdf67e2a543e2672a5535ef6c1ffc5ef7190c8c32db63eebc4f0",  // staker_pool_info selector
        calldata: [stakerAddress, STRK_ADDRESS],
      },
      "latest",
    ]);
    if (result && result.length > 0) {
      return result[0];
    }
    return null;
  } catch {
    return null;
  }
}

export function useStaking(address: string | null, wallet: any | null) {
  const [pools, setPools] = useState<StakingPool[]>(FALLBACK_POOLS);
  const [myPositions, setMyPositions] = useState<StakingPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTxPending, setIsTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poolAddresses, setPoolAddresses] = useState<Record<string, string>>({});

  const fetchPools = useCallback(async () => {
    // Show fallback immediately
    setPools(FALLBACK_POOLS);

    // Try to get real pool addresses in background
    try {
      const addresses: Record<string, string> = {};
      for (const validator of KNOWN_VALIDATORS) {
        const poolAddr = await getPoolAddress(validator.stakerAddress);
        if (poolAddr) {
          addresses[validator.stakerAddress] = poolAddr;
        }
      }
      if (Object.keys(addresses).length > 0) {
        setPoolAddresses(addresses);
        console.log("Real pool addresses:", addresses);
      }
    } catch (err) {
      console.warn("Could not fetch pool addresses:", err);
    }
  }, []);

  const stake = useCallback(async (poolId: string, amount: string) => {
    if (!address || !wallet) throw new Error("Wallet not connected");
    setIsTxPending(true);
    try {
      // Get the real pool contract address
      const poolContractAddress = poolAddresses[poolId] ?? poolId;

      // Convert amount to FRI (1 STRK = 1e18 FRI)
      const amountBig = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const amountLow = (amountBig & BigInt("0xffffffffffffffffffffffffffffffff")).toString();
      const amountHigh = (amountBig >> BigInt(128)).toString();

      console.log("Staking:", { poolContractAddress, amountLow, amountHigh });

      const tx = await wallet.browserAccount.execute([
        // Step 1: Approve STRK transfer to pool contract
        {
          contractAddress: STRK_ADDRESS,
          entrypoint: "approve",
          calldata: [poolContractAddress, amountLow, amountHigh],
        },
        // Step 2: Enter delegation pool
        {
          contractAddress: poolContractAddress,
          entrypoint: "enter_delegation_pool",
          calldata: [address, amountLow, amountHigh],
        },
      ]);

      await new Promise((res) => setTimeout(res, 3000));
      return tx.transaction_hash;
    } finally {
      setIsTxPending(false);
    }
  }, [address, wallet, poolAddresses]);

  const claimRewards = useCallback(async (poolId: string) => {
    if (!address || !wallet) throw new Error("Wallet not connected");
    setIsTxPending(true);
    try {
      const poolContractAddress = poolAddresses[poolId] ?? poolId;

      const tx = await wallet.browserAccount.execute([{
        contractAddress: poolContractAddress,
        entrypoint: "claim_rewards",
        calldata: [address],
      }]);

      await new Promise((res) => setTimeout(res, 3000));
      return tx.transaction_hash;
    } finally {
      setIsTxPending(false);
    }
  }, [address, wallet, poolAddresses]);

  const unstake = useCallback(async (poolId: string, amount: string) => {
    if (!address || !wallet) throw new Error("Wallet not connected");
    setIsTxPending(true);
    try {
      const poolContractAddress = poolAddresses[poolId] ?? poolId;

      const amountBig = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const amountLow = (amountBig & BigInt("0xffffffffffffffffffffffffffffffff")).toString();
      const amountHigh = (amountBig >> BigInt(128)).toString();

      const tx = await wallet.browserAccount.execute([{
        contractAddress: poolContractAddress,
        entrypoint: "exit_delegation_pool_intent",
        calldata: [amountLow, amountHigh],
      }]);

      await new Promise((res) => setTimeout(res, 3000));
      return tx.transaction_hash;
    } finally {
      setIsTxPending(false);
    }
  }, [address, wallet, poolAddresses]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return { pools, myPositions, isLoading, isTxPending, error, stake, claimRewards, unstake, refetch: fetchPools };
}