"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StakingPool } from "@/types";
import { sdk } from "@/lib/sdk";
import { mainnetValidators, Staking, Amount } from "starkzap";

const POOLS_CONFIG = [
  {
    name: "Karnot",
    stakerAddress: mainnetValidators.KARNOT.stakerAddress,
  },
  {
    name: "Nethermind",
    stakerAddress: mainnetValidators.NETHERMIND.stakerAddress,
  },
  {
    name: "Cartridge",
    stakerAddress: mainnetValidators.CARTRIDGE.stakerAddress,
  },
];

export function useStaking(address: string | null, wallet: any | null) {
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [myPositions, setMyPositions] = useState<StakingPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTxPending, setIsTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to avoid stale closure / useEffect loop issues
  const instancesRef = useRef<Record<string, Staking>>({});
  const poolsRef = useRef<StakingPool[]>([]);

  const fetchPositions = useCallback(async (
    currentAddress: string,
    instances: Record<string, Staking>,
    currentPools: StakingPool[]
  ) => {
    const positions: StakingPool[] = [];

    for (const [poolAddress, stakingInstance] of Object.entries(instances)) {
      try {
        const position = await stakingInstance.getPosition({ address: currentAddress } as any);
        if (position && !position.staked.isZero()) {
          const pool = currentPools.find((p) => p.id === poolAddress);
          positions.push({
            id: poolAddress,
            name: pool?.name ?? "Unknown",
            validator: pool?.validator ?? "",
            apy: pool?.apy ?? 0,
            totalStaked: pool?.totalStaked ?? "0",
            myStaked: position.staked.toUnit(),
            myRewards: position.rewards.toUnit(),
            status: "active",
          });
        }
      } catch {
        // Not a member of this pool — expected
      }
    }

    setMyPositions(positions);
  }, []);

  const fetchPools = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const resolvedPools: StakingPool[] = [];
    const instances: Record<string, Staking> = {};

    try {
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

          // Fetch total delegated amount for this pool
          let totalStaked = "0";
          try {
            const stakerPools = await sdk.getStakerPools(config.stakerAddress);
            const strkPool = stakerPools.find((p: any) => p.token?.symbol === "STRK");
            if (strkPool?.amount) {
              totalStaked = strkPool.amount.toUnit();
            }
          } catch {
            // non-critical
          }

          resolvedPools.push({
            id: poolAddress,
            name: config.name,
            validator: config.stakerAddress,
            apy,
            totalStaked,
            myStaked: "0",
            myRewards: "0",
            status: "active",
          });

          console.log("Loaded pool:", config.name, poolAddress, "total:", totalStaked);
        } catch (e: any) {
          console.warn("Skipping pool", config.name, e.message);
        }
      }

      instancesRef.current = instances;
      poolsRef.current = resolvedPools;

      setPools(resolvedPools);

      // Fetch positions immediately after pools load if wallet connected
      if (address && Object.keys(instances).length > 0) {
        await fetchPositions(address, instances, resolvedPools);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [address, fetchPositions]);

  const stake = useCallback(
    async (poolId: string, amount: string) => {
      if (!wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      const walletAddress = address || account.address || wallet.address;
      if (!walletAddress) throw new Error("Could not resolve wallet address");

      const stakingInstance = instancesRef.current[poolId];
      if (!stakingInstance) throw new Error("Pool not found");

      setIsTxPending(true);
      try {
        console.log("Staking from:", walletAddress, "pool:", poolId, "amount:", amount);

        const strkToken = (stakingInstance as any).token;
        const amountParsed = Amount.parse(amount, strkToken);

        const isMember = await stakingInstance.isMember({ address: walletAddress } as any);
        console.log("Is member:", isMember);

        const calls = isMember
          ? (stakingInstance as any).populateAdd(walletAddress, amountParsed)
          : (stakingInstance as any).populateEnter(walletAddress, amountParsed);

        const tx = await account.execute(calls);
        console.log("Stake tx:", tx.transaction_hash);

        await new Promise((res) => setTimeout(res, 4000));
        await fetchPositions(walletAddress, instancesRef.current, poolsRef.current);
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, fetchPositions]
  );

  const claimRewards = useCallback(
    async (poolId: string) => {
      if (!wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      const walletAddress = address || account.address || wallet.address;
      if (!walletAddress) throw new Error("Could not resolve wallet address");

      const stakingInstance = instancesRef.current[poolId];
      if (!stakingInstance) throw new Error("Pool not found");

      setIsTxPending(true);
      try {
        const call = (stakingInstance as any).populateClaimRewards(walletAddress);
        const tx = await account.execute([call]);
        await new Promise((res) => setTimeout(res, 4000));
        await fetchPositions(walletAddress, instancesRef.current, poolsRef.current);
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, fetchPositions]
  );

  const unstake = useCallback(
    async (poolId: string, amount: string) => {
      if (!wallet) throw new Error("Wallet not connected");
      const account = wallet.browserAccount || wallet.getAccount?.();
      if (!account) throw new Error("No account available");

      const walletAddress = address || account.address || wallet.address;
      if (!walletAddress) throw new Error("Could not resolve wallet address");

      const stakingInstance = instancesRef.current[poolId];
      if (!stakingInstance) throw new Error("Pool not found");

      setIsTxPending(true);
      try {
        const strkToken = (stakingInstance as any).token;
        const amountParsed = Amount.parse(amount, strkToken);
        const call = (stakingInstance as any).populateExitIntent(amountParsed);
        const tx = await account.execute([call]);
        await new Promise((res) => setTimeout(res, 4000));
        await fetchPositions(walletAddress, instancesRef.current, poolsRef.current);
        return tx.transaction_hash;
      } finally {
        setIsTxPending(false);
      }
    },
    [address, wallet, fetchPositions]
  );

  // Only run once on mount
  useEffect(() => {
    fetchPools();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch positions when address changes (e.g. wallet connects after pools loaded)
  useEffect(() => {
    if (address && Object.keys(instancesRef.current).length > 0) {
      fetchPositions(address, instancesRef.current, poolsRef.current);
    }
  }, [address, fetchPositions]);

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