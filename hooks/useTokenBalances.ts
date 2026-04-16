"use client";

import { useState, useEffect, useCallback } from "react";
import { TokenBalance } from "@/types";
import { TOKENS } from "@/lib/sdk";

const RPC_URL = "https://api.cartridge.gg/x/starknet/mainnet";

async function fetchPrices(): Promise<Record<string, any>> {
  try {
    const res = await fetch("/api/prices", { cache: "no-store" });
    if (!res.ok) throw new Error("Price fetch failed");
    return await res.json();
  } catch {
    return {
      ethereum: { usd: 1600, usd_24h_change: 0 },
      starknet: { usd: 0.034, usd_24h_change: 0 },
      "usd-coin": { usd: 1.0, usd_24h_change: 0.0 },
      tether: { usd: 1.0, usd_24h_change: 0.0 },
    };
  }
}

async function getTokenBalance(tokenAddress: string, ownerAddress: string): Promise<bigint> {
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "starknet_call",
        params: [
          {
            contract_address: tokenAddress,
            entry_point_selector: "0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e",
            calldata: [ownerAddress],
          },
          "latest",
        ],
        id: 1,
      }),
    });
    const data = await response.json();
    if (data.result && data.result.length > 0) {
      const low = BigInt(data.result[0] ?? "0");
      const high = BigInt(data.result[1] ?? "0");
      return low + high * BigInt(2 ** 128);
    }
    return BigInt(0);
  } catch {
    return BigInt(0);
  }
}

export function useTokenBalances(address: string | null, wallet: any | null) {
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
          const raw = await getTokenBalance(token.address, address);

          const divisor = BigInt(10 ** token.decimals);
          const whole = raw / divisor;
          const fraction = raw % divisor;
          const formatted = whole.toString() + "." + fraction
            .toString()
            .padStart(token.decimals, "0")
            .slice(0, 4);

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