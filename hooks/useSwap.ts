"use client";

import { useState, useCallback } from "react";
import { SwapQuote } from "@/types";
import { mainnetTokens, AvnuSwapProvider, Amount, fromAddress as parseAddress } from "starkzap";
import { TOKENS } from "@/lib/sdk";

function getSdkToken(address: string) {
  // First try exact address match
  const byAddress = Object.values(mainnetTokens).find(
    (t: any) => t.address.toLowerCase() === address.toLowerCase()
  ) as any | undefined;
  if (byAddress) return byAddress;

  // Fallback: match by symbol via local TOKENS map
  const localToken = Object.values(TOKENS).find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
  if (!localToken) return undefined;

  // Find SDK token by symbol
  return Object.values(mainnetTokens).find(
    (t: any) => t.symbol === localToken.symbol ||
    // Handle USDC.e -> USDC fallback
    (localToken.symbol === "USDC" && t.symbol === "USDC.e") ||
    (localToken.symbol === "USDC.e" && t.symbol === "USDC")
  ) as any | undefined;
}

function getSymbolFromAddress(address: string): string {
  const token = Object.values(TOKENS).find((t) => t.address === address);
  return token?.symbol ?? "ETH";
}

const avnu = new AvnuSwapProvider();

export function useSwap(address: string | null, wallet: any | null) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [rawQuote, setRawQuote] = useState<any>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const getQuote = useCallback(async (fromAddress: string, toAddress: string, amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setRawQuote(null);
      return;
    }
    setIsQuoting(true);
    setError(null);
    try {
      const tokenIn = getSdkToken(fromAddress);
      const tokenOut = getSdkToken(toAddress);
      if (!tokenIn || !tokenOut) throw new Error("Token not found in SDK");

      const amountIn = Amount.parse(amount, tokenIn);
      // Use string literal for chainId — avoids ChainId class import issues
      const chainId = { toLiteral: () => "SN_MAIN", isMainnet: () => true } as any;

      const sdkQuote = await avnu.getQuote({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        takerAddress: address ? (parseAddress(address) as any) : undefined,
      });

      setRawQuote({ tokenIn, tokenOut, amountIn, chainId });

      const outAmount = Amount.fromRaw(sdkQuote.amountOutBase, tokenOut);
      const priceImpact = sdkQuote.priceImpactBps != null
        ? Number(sdkQuote.priceImpactBps) / 100
        : 0.04;

      setQuote({
        fromToken: fromAddress,
        toToken: toAddress,
        fromAmount: amount,
        toAmount: outAmount.toUnit(),
        priceImpact,
        route: [tokenIn.symbol, tokenOut.symbol],
        estimatedGas: "Gasless",
        expiresAt: Date.now() + 30_000,
      });
    } catch (e: any) {
      console.error("Quote error:", e.message);
      setError(e.message);
      setQuote(null);
      setRawQuote(null);
    } finally {
      setIsQuoting(false);
    }
  }, [address]);

  const executeSwap = useCallback(async (q: SwapQuote, slippage: number = 0.5) => {
    if (!address || !wallet) throw new Error("Wallet not connected");
    const account = wallet.browserAccount || wallet.getAccount?.();
    if (!account) throw new Error("No account available");
    if (!rawQuote) throw new Error("No quote available — please refresh");

    setIsSwapping(true);
    setError(null);
    try {
      const { tokenIn, tokenOut, amountIn, chainId } = rawQuote;
      const slippageBps = BigInt(Math.round(slippage * 100));

      const prepared = await avnu.prepareSwap({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        takerAddress: parseAddress(address) as any,
        slippageBps,
      });

      console.log("Swap calls prepared:", prepared.calls.length);
      const tx = await account.execute(prepared.calls);
      console.log("Swap tx:", tx.transaction_hash);

      setLastTxHash(tx.transaction_hash);
      setQuote(null);
      setRawQuote(null);
      return tx.transaction_hash;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsSwapping(false);
    }
  }, [address, wallet, rawQuote]);

  return { quote, isQuoting, isSwapping, error, lastTxHash, getQuote, executeSwap };
}