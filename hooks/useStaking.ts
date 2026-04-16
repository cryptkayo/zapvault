"use client";

import { useState, useEffect, useCallback } from "react";
import { StakingPool } from "@/types";
import { sdk } from "@/lib/sdk";
import { mainnetValidators, Staking, Amount } from "starkzap";

const POOLS_CONFIG = [
  {
    name: "Ready (Argent)",
    stakerAddress: mainnetValidators.READY_PREV_ARGENT.stakerAddress,
  },
  {
    name: "Braavos",
    stakerAddress: mainnetValidators.BRAAVOS.stakerAddress,
  },
  {
    name: "AVNU",
    stakerAddress: mainnetValidators.AVNU.stakerAddress,
  },
];

export function useStaking(address: string | null, wallet: any | null) {
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [stakingInstances, setStakingInstances] = useState<Record<string, Staking>>({});
  const [myPositions, setMyPositions] = useState<StakingPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTxPending, setIsTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const resolvedPools: StakingPool[] = [];
    const instances: Record<string, Staking> = {};

    const tokens = await sdk.stakingTokens();
    const strkToken = tokens.find((t: any) => t.symbol === "STRK");

    if (!strkToken) {
      setError("STRK token not found");
      setIsLoading(false);
      return;
    }

    const provider = sdk.getProvider();

    for (const config of POOLS_CONFIG) {
      try {
        const stakingInstance = await Staking.fromStaker(
          config.stakerAddress,
          strkToken,
          provider,
          (sdk as any).getStakingConfig()
        );

        const poolAddress = stakingInstance.poolAddress;
        instances[poolAddress] = stakingInstance;

        const commission = await stakingInstance.getCommission();
        const apy = Math.round(7.5 * (1 - commission / 100) * 10) / 10;

        resolvedPools.push({
          id: poolAddress,
          name: config.name,
          validator: config.stakerAddress,
          apy,
          totalStaked: "0",
          myStaked: "0",
          myRewards: "0",
          status: "active",
        });

        console.log("Loaded pool:", config.name, poolAddress);
      } catch (e: any) {
        console.warn("Skipping pool", config.name, e.message);
      }
    }

    setPools(resolvedPools);
    setStakingInstances(instances);
    setIsLoading(false);
  }, []);

  const fetchPositions = useCallback(async () => {
    if (!address || Object.keys(stakingInstances).length === 0) return;

    const positions: StakingPool[] = [];

    for (const [poolAddress, stakingInstance] of Object.entries(stakingInstances)) {
      try {
        const position = await stakingInstance.getPosition(address as any);
        if (position && !position.staked.isZero()) {
          const pool = pools.find((p) => p.id === poolAddress);
          positions.push({
            id: poolAddress,
            name: pool?.name ?? "Unknown",
            validator: pool?.validator ?? "",
            apy: pool?.apy ?? 0,
            totalStaked: pool?.totalStaked ?? "0",
            myStaked: position.staked.toFormatted(),
            myRewards: position.rewards.toFormatted(),
            status: "active",
          });
        }
      } catch {
        // Not a member of this pool
      }
    }

    setMyPositions(positions);
  }, [address, stakingInstances, pools]);

  const stake = useCallback(
    async (poolId: string, amount: string) => {
      if (!wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      // Resolve address from all available sources
      const walletAddress = address || account.address || wallet.address;
      if (!walletAddress) throw new Error("Could not resolve wallet address");

      const stakingInstance = stakingInstances[poolId];
      if (!stakingInstance) throw new Error("Pool not found");

      setIsTxPending(true);
      try {
        console.log("Staking from:", walletAddress, "pool:", poolId, "amount:", amount);

        const strkToken = (stakingInstance as any).token;
        const amountParsed = Amount.parse(amount, strkToken);

        const isMember = await stakingInstance.isMember(walletAddress as any);
        console.log("Is member:", isMember);

        const calls = isMember
          ? (stakingInstance as any).populateAdd(walletAddress, amountParsed)
          : (stakingInstance as any).populateEnter(walletAddress, amountParsed);

        console.log("Calls:", JSON.stringify(calls));

        const tx = await account.execute(calls);
        console.log("Stake tx:", tx.transaction_hash);

        await new Promise((res) => setTimeout(res, 3000));
        await fetchPositions();
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, stakingInstances, fetchPositions]
  );

  const claimRewards = useCallback(
    async (poolId: string) => {
      if (!wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      const walletAddress = address || account.address || wallet.address;
      if (!walletAddress) throw new Error("Could not resolve wallet address");

      const stakingInstance = stakingInstances[poolId];
      if (!stakingInstance) throw new Error("Pool not found");

      setIsTxPending(true);
      try {
        const call = (stakingInstance as any).populateClaimRewards(walletAddress);
        const tx = await account.execute([call]);
        await new Promise((res) => setTimeout(res, 3000));
        await fetchPositions();
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, stakingInstances, fetchPositions]
  );

  const unstake = useCallback(
    async (poolId: string, amount: string) => {
      if (!wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      const walletAddress = address || account.address || wallet.address;
      if (!walletAddress) throw new Error("Could not resolve wallet address");

      const stakingInstance = stakingInstances[poolId];
      if (!stakingInstance) throw new Error("Pool not found");

      setIsTxPending(true);
      try {
        const strkToken = (stakingInstance as any).token;
        const amountParsed = Amount.parse(amount, strkToken);
        const call = (stakingInstance as any).populateExitIntent(amountParsed);
        const tx = await account.execute([call]);
        await new Promise((res) => setTimeout(res, 3000));
        await fetchPositions();
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, stakingInstances, fetchPositions]
  );

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  useEffect(() => {
    if (address && Object.keys(stakingInstances).length > 0) {
      fetchPositions();
    }
  }, [address, stakingInstances, fetchPositions]);

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