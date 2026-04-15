"use client";

import { useState, useEffect, useCallback } from "react";
import { sdk } from "@/lib/sdk";
import { BridgeToken, BridgeQuote } from "@/types";

export function useBridge(address: string | null) {
  const [tokens, setTokens] = useState<BridgeToken[]>([]);
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const fetchBridgeTokens = useCallback(async () => {
    setIsLoading(true);
    try {
      // @ts-ignore
      const supported = await sdk.bridging.getBridgingTokens({
        fromChain: "ethereum",
        toChain: "starknet",
      });
      const formatted: BridgeToken[] = supported.map((t: any) => ({
        symbol: t.symbol,
        name: t.name,
        address: t.address,
        logoUrl: t.logoUrl,
        chains: t.supportedChains ?? ["ethereum", "starknet"],
      }));
      setTokens(formatted);
    } catch {
      setTokens([
        { symbol: "ETH", name: "Ethereum", address: "0x0", chains: ["ethereum", "starknet"] },
        { symbol: "USDC", name: "USD Coin", address: "0x1", chains: ["ethereum", "starknet"] },
        { symbol: "USDT", name: "Tether USD", address: "0x2", chains: ["ethereum", "starknet"] },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getQuote = useCallback(async (token: string, amount: string) => {
    if (!amount || parseFloat(amount) === 0) {
      setQuote(null);
      return;
    }
    setIsQuoting(true);
    setError(null);
    try {
      // @ts-ignore
      const q = await sdk.bridging.getQuote({
        fromChain: "ethereum",
        toChain: "starknet",
        token,
        amount,
      });
      setQuote({
        fromChain: "Ethereum",
        toChain: "Starknet",
        token,
        amount,
        estimatedFee: q.estimatedFee ?? "~$3-8",
        estimatedTime: q.estimatedTime ?? "~10 min",
        route: q.route ?? "Official Starknet Bridge",
      });
    } catch (err: any) {
      setError(err.message || "Failed to get bridge quote");
    } finally {
      setIsQuoting(false);
    }
  }, []);

  const deposit = useCallback(async (token: string, amount: string, ethereumSigner: any) => {
    if (!address) throw new Error("Wallet not connected");
    setIsBridging(true);
    setError(null);
    try {
      // @ts-ignore
      const tx = await sdk.bridging.deposit({
        fromChain: "ethereum",
        toChain: "starknet",
        token,
        amount,
        recipientAddress: address,
        signer: ethereumSigner,
      });
      await tx.wait();
      setLastTxHash(tx.hash);
      setQuote(null);
      return tx.hash;
    } catch (err: any) {
      setError(err.message || "Bridge deposit failed");
      throw err;
    } finally {
      setIsBridging(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBridgeTokens();
  }, [fetchBridgeTokens]);

  return { tokens, quote, isLoading, isQuoting, isBridging, error, lastTxHash, getQuote, deposit };
}