"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { addTransaction } from "@/hooks/useTransactions";
import { SwapQuote } from "@/types";
import { mainnetTokens, AvnuSwapProvider, Amount, fromAddress as parseAddress } from "starkzap";
import { TOKENS } from "@/lib/sdk";

const QUOTE_TTL_MS = 25_000;

function getSdkToken(address: string) {
  const byAddress = Object.values(mainnetTokens).find(
    (t: any) => t.address.toLowerCase() === address.toLowerCase()
  ) as any | undefined;
  if (byAddress) return byAddress;

  const localToken = Object.values(TOKENS).find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
  if (!localToken) return undefined;

  return Object.values(mainnetTokens).find(
    (t: any) => (t as any).symbol === localToken.symbol || (t as any).symbol === "USDC.e"
  ) as any | undefined;
}

const avnu = new AvnuSwapProvider();

export function useSwap(address: string | null, wallet: any | null) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteAge, setQuoteAge] = useState(0);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const lastParamsRef = useRef<{ fromAddress: string; toAddress: string; amount: string } | null>(null);
  const quoteTimeRef = useRef<number>(0);
  const refreshTimerRef = useRef<any>(null);
  const ageTimerRef = useRef<any>(null);

  const getQuote = useCallback(async (fromAddress: string, toAddress: string, amount: string, silent = false) => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      lastParamsRef.current = null;
      return;
    }
    if (!silent) setIsQuoting(true);
    setError(null);

    try {
      const tokenIn = getSdkToken(fromAddress);
      const tokenOut = getSdkToken(toAddress);
      if (!tokenIn || !tokenOut) throw new Error("Token not found in SDK");

      const amountIn = Amount.parse(amount, tokenIn);
      const chainId = { toLiteral: () => "SN_MAIN", isMainnet: () => true } as any;

      const sdkQuote = await avnu.getQuote({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        takerAddress: address ? (parseAddress(address) as any) : undefined,
      });

      const outAmount = Amount.fromRaw(sdkQuote.amountOutBase, tokenOut);
      // priceImpactBps is a bigint in basis points (e.g. -807n = -8.07%)
      // Divide by 100 to get percentage
      const priceImpact = sdkQuote.priceImpactBps != null
        ? Math.abs(Number(sdkQuote.priceImpactBps) / 100)
        : 0.04;

      setQuote({
        fromToken: fromAddress,
        toToken: toAddress,
        fromAmount: amount,
        toAmount: outAmount.toUnit(),
        priceImpact,
        route: [tokenIn.symbol, tokenOut.symbol],
        estimatedGas: "<$0.01",
        expiresAt: Date.now() + QUOTE_TTL_MS,
      });

      quoteTimeRef.current = Date.now();
      lastParamsRef.current = { fromAddress, toAddress, amount };
      setQuoteAge(0);
    } catch (e: any) {
      const msg = e.message ?? "";
      let userError = msg;
      if (msg.includes("no routes") || msg.includes("No route")) {
        userError = "No swap route found. Try a larger amount (min ~1 STRK or 0.001 ETH).";
      }
      if (!silent) {
        setError(userError);
        setQuote(null);
        lastParamsRef.current = null;
      }
    } finally {
      if (!silent) setIsQuoting(false);
    }
  }, [address]);

  // Auto-refresh quote every 25s
  useEffect(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (ageTimerRef.current) clearInterval(ageTimerRef.current);
    if (!lastParamsRef.current) return;

    ageTimerRef.current = setInterval(() => {
      setQuoteAge(Math.floor((Date.now() - quoteTimeRef.current) / 1000));
    }, 1000);

    refreshTimerRef.current = setInterval(() => {
      const p = lastParamsRef.current;
      if (p) getQuote(p.fromAddress, p.toAddress, p.amount, true);
    }, QUOTE_TTL_MS);

    return () => {
      clearInterval(refreshTimerRef.current);
      clearInterval(ageTimerRef.current);
    };
  }, [quote, getQuote]);

  const executeSwap = useCallback(async (q: SwapQuote, slippage: number = 2.0) => {
    if (!address || !wallet) throw new Error("Wallet not connected");
    const account = wallet.browserAccount || wallet.getAccount?.();
    if (!account) throw new Error("No account available");

    const tokenIn = getSdkToken(q.fromToken);
    const tokenOut = getSdkToken(q.toToken);
    if (!tokenIn || !tokenOut) throw new Error("Token not found");

    setIsSwapping(true);
    setError(null);

    try {
      const amountIn = Amount.parse(q.fromAmount, tokenIn);
      const chainId = { toLiteral: () => "SN_MAIN", isMainnet: () => true } as any;
      const slippageBps = BigInt(Math.round(slippage * 100));

      console.log("SWAP EXECUTE:", { from: tokenIn.symbol, to: tokenOut.symbol, amount: q.fromAmount, slippage });

      // Get fresh swap calls from Starkzap's AvnuSwapProvider
      const prepared = await avnu.prepareSwap({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        takerAddress: parseAddress(address) as any,
        slippageBps,
      });

      const normalizedCalls = prepared.calls.map((call: any) => {
        let calldata = call.calldata ?? [];
        if (!Array.isArray(calldata)) calldata = Object.values(calldata);
        calldata = calldata.map((v: any) => v?.toString() ?? "0");
        const addr = call.contractAddress?.toString() ?? "";
        const paddedAddr = addr.startsWith("0x") ? "0x" + addr.slice(2).padStart(64, "0") : addr;
        return { contractAddress: paddedAddr, entrypoint: call.entrypoint, calldata };
      });

      console.log("Executing", normalizedCalls.length, "calls with slippage:", slippage, "%");
      const tx = await account.execute(normalizedCalls);
      const txHash = tx?.transaction_hash ?? tx?.transactionHash ?? tx?.hash ?? null;
      console.log("Swap tx:", txHash);
      if (txHash) {
        addTransaction({
          hash: txHash,
          type: "swap",
          label: `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`,
          color: "text-cyan-400",
          status: "success",
          contractName: "AVNU Exchange",
        });
      }
      setLastTxHash(txHash);
      setQuote(null);
      lastParamsRef.current = null;
      return txHash;
    } catch (e: any) {
      const msg = e.message ?? "";
      let userError = msg;
      if (msg.includes("Insufficient tokens received") || msg.includes("insufficient")) {
        userError = `Slippage too low (${slippage}%). Try increasing to ${Math.min(slippage + 2, 10)}% in Settings.`;
      } else if (msg.includes("multicall") || msg.includes("Multicall")) {
        userError = "Swap failed — try increasing slippage in Settings (3-5%).";
      } else if (msg.includes("no routes") || msg.includes("No route")) {
        userError = "No swap route available. Try a different amount or token pair.";
      }
      setError(userError);
      throw new Error(userError);
    } finally {
      setIsSwapping(false);
    }
  }, [address, wallet]);

  const clearQuote = useCallback(() => {
    setQuote(null);
    setError(null);
    lastParamsRef.current = null;
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (ageTimerRef.current) clearInterval(ageTimerRef.current);
  }, []);

  return { quote, quoteAge, isQuoting, isSwapping, error, lastTxHash, getQuote, executeSwap, clearQuote };
}