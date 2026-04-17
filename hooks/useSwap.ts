"use client";

import { useState, useCallback } from "react";
import { sdk } from "@/lib/sdk";
import { SwapQuote } from "@/types";
import { mainnetTokens, AvnuSwapProvider, Amount, ChainId } from "starkzap";

// Map our local token addresses to SDK token objects
function getSdkToken(address: string) {
  return Object.values(mainnetTokens).find(
    (t: any) => t.address.toLowerCase() === address.toLowerCase()
  ) as any | undefined;
}

const avnu = new AvnuSwapProvider();

export function useSwap(address: string | null, wallet: any | null) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [rawQuote, setRawQuote] = useState<any>(null); // SDK quote for execution
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
      const chainId = ChainId.MAINNET;

      // Get real quote from AVNU via SDK
      const sdkQuote = await avnu.getQuote({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        takerAddress: address ?? undefined,
      });

      // Store raw quote for execution
      setRawQuote({ tokenIn, tokenOut, amountIn, chainId });

      // Calculate output amount
      const amountOutRaw = sdkQuote.amountOutBase;
      const outAmount = Amount.fromRaw(amountOutRaw, tokenOut);

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
        estimatedGas: "Gasless via Starkzap",
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
    if (!rawQuote) throw new Error("No quote available — please refresh the quote");

    setIsSwapping(true);
    setError(null);

    try {
      const { tokenIn, tokenOut, amountIn, chainId } = rawQuote;

      // Convert slippage % to bps (0.5% = 50 bps)
      const slippageBps = BigInt(Math.round(slippage * 100));

      // Get fresh swap calls from AVNU SDK
      const prepared = await avnu.prepareSwap({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        takerAddress: address,
        slippageBps,
      });

      console.log("Swap calls:", prepared.calls.length, "calls prepared");

      // Execute via wallet's browserAccount — triggers Argent X popup
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