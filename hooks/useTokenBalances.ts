"use client";

import { useState, useEffect, useCallback } from "react";
import { TokenBalance } from "@/types";
import { sdk, TOKENS } from "@/lib/sdk";

async function fetchPrices(): Promise<Record<string, any>> {
  try {
    const ids = Object.values(TOKENS).map((t) => t.coingeckoId).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    return await res.json();
  } catch {
    return {
      ethereum: { usd: 3200, usd_24h_change: 1.2 },
      starknet: { usd: 0.85, usd_24h_change: -0.5 },
      "usd-coin": { usd: 1.0, usd_24h_change: 0.01 },
      tether: { usd: 1.0, usd_24h_change: 0.0 },
    };
  }
}

export function useTokenBalances(address: string | null) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalUsd, setTotalUsd] = useState(0);

  const fetchBalances = useCallback(async () => {
    if (!address) {
      setBalances([]);
      setTotalUsd(0);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const prices = await fetchPrices();

      const balanceResults = await Promise.allSettled(
        Object.values(TOKENS).map(async (token) => {
          try {
            const balance = await sdk.tokens.getBalance({
              tokenAddress: token.address,
              ownerAddress: address,
            });

            const raw = BigInt(balance.raw ?? "0");
            const divisor = BigInt(10 ** token.decimals);
            const whole = raw / divisor;
            const fraction = raw % divisor;
            const formatted = `${whole}.${fraction
              .toString()
              .padStart(token.decimals, "0")
              .slice(0, 4)}`;

            const numericBalance = parseFloat(formatted);
            const priceData = prices[token.coingeckoId];
            const usdPrice = priceData?.usd ?? 0;
            const change24h = priceData?.usd_24h_change ?? 0;
            const usdValue = numericBalance * usdPrice;

            return {
              symbol: token.symbol,
              name: token.name,
              address: token.address,
              decimals: token.decimals,
              raw,
              formatted,
              usdValue,
              color: token.color,
              change24h,
            } as TokenBalance;
          } catch {
            return {
              symbol: token.symbol,
              name: token.name,
              address: token.address,
              decimals: token.decimals,
              raw: BigInt(0),
              formatted: "0.0000",
              usdValue: 0,
              color: token.color,
              change24h: 0,
            } as TokenBalance;
          }
        })
      );

      const resolved = balanceResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<TokenBalance>).value);

      const total = resolved.reduce((sum, b) => sum + b.usdValue, 0);
      setBalances(resolved);
      setTotalUsd(total);
    } catch (err: any) {
      setError(err.message || "Failed to fetch balances");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 30_000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return { balances, isLoading, error, totalUsd, refetch: fetchBalances };
}