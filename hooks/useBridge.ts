"use client";

import { useState, useEffect, useCallback } from "react";
import { sdk } from "@/lib/sdk";
import { BridgeToken } from "@/types";

export function useBridge(address: string | null) {
  const [tokens, setTokens] = useState<BridgeToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBridgeTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use Starkzap SDK to fetch real bridgeable tokens
      const supported = await sdk.getBridgingTokens();
      const formatted: BridgeToken[] = supported
        .filter((t: any) => t.symbol && t.name)
        .map((t: any) => ({
          symbol: t.symbol,
          name: t.name,
          address: t.address ?? "",
          logoUrl: t.metadata?.logoUrl?.toString() ?? "",
          chains: ["ethereum", "starknet"],
        }))
        // Show most common tokens first
        .sort((a: BridgeToken, b: BridgeToken) => {
          const priority: Record<string, number> = { ETH: 0, USDC: 1, USDT: 2, STRK: 3 };
          return (priority[a.symbol] ?? 99) - (priority[b.symbol] ?? 99);
        });

      setTokens(formatted.length > 0 ? formatted : getFallbackTokens());
    } catch (e: any) {
      console.warn("Failed to fetch bridge tokens:", e.message);
      setTokens(getFallbackTokens());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBridgeTokens();
  }, [fetchBridgeTokens]);

  return { tokens, isLoading, error, refetch: fetchBridgeTokens };
}

function getFallbackTokens(): BridgeToken[] {
  return [
    { symbol: "ETH", name: "Ethereum", address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png", chains: ["ethereum", "starknet"] },
    { symbol: "USDC", name: "USD Coin", address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8", logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png", chains: ["ethereum", "starknet"] },
    { symbol: "USDT", name: "Tether USD", address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8", logoUrl: "https://assets.coingecko.com/coins/images/325/small/tether.png", chains: ["ethereum", "starknet"] },
    { symbol: "STRK", name: "Starknet Token", address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", logoUrl: "https://assets.coingecko.com/coins/images/26433/small/starknet.png", chains: ["ethereum", "starknet"] },
  ];
}