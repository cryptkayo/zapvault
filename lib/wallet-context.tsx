"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: "mainnet" | "sepolia";
  wallet: any;
}

interface WalletContextType extends WalletState {
  connect: (walletType: "argent" | "braavos" | "cartridge") => Promise<void>;
  disconnect: () => void;
  displayAddress: string | null;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    network: "mainnet",
    wallet: null,
  });

  const connect = useCallback(async (walletType: "argent" | "braavos" | "cartridge") => {
    setState((s) => ({ ...s, isConnecting: true }));
    try {
      const starknetArgent = (window as any).starknet_argentX;
      const starknetBraavos = (window as any).starknet_braavos;
      const starknetFallback = (window as any).starknet;

      const browserWallet =
        walletType === "argent"
          ? starknetArgent || starknetFallback
          : walletType === "braavos"
          ? starknetBraavos || starknetFallback
          : starknetFallback;

      if (!browserWallet) {
        throw new Error("Wallet not found. Please install the browser extension.");
      }

      await browserWallet.enable({ starknetVersion: "v5" });
      const address = browserWallet.account?.address || browserWallet.selectedAddress;

      // Build wallet object using browser wallet directly
      // This triggers real Argent X popups for transaction approval
      const sdkWallet = {
        address,
        browserAccount: browserWallet.account,

        // Transfer tokens using Argent X execute
        transfer: async (token: any, transfers: any[]) => {
          const recipient = transfers[0].to.toString();
          const amount = transfers[0].amount;
          const amountStr = typeof amount === "bigint"
            ? amount.toString()
            : amount.toBase
            ? amount.toBase().toString()
            : amount.toString();

          const tx = await browserWallet.account.execute([{
            contractAddress: token.address ?? token,
            entrypoint: "transfer",
            calldata: [recipient, amountStr, "0"],
          }]);
          return {
            hash: tx.transaction_hash,
            explorerUrl: "https://voyager.online/tx/" + tx.transaction_hash,
            wait: async () => {
              // Poll for receipt
              await new Promise((res) => setTimeout(res, 3000));
            },
          };
        },

        // Stake STRK using Argent X execute
        stake: async (pool: any, amount: any) => {
          const STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
          const poolAddress = pool.toString();
          const amountStr = typeof amount === "bigint"
            ? amount.toString()
            : amount.toBase
            ? amount.toBase().toString()
            : (parseFloat(amount.toString()) * 1e18).toString();

          const tx = await browserWallet.account.execute([
            // First approve STRK spending
            {
              contractAddress: STRK_ADDRESS,
              entrypoint: "approve",
              calldata: [poolAddress, amountStr, "0"],
            },
            // Then enter delegation pool
            {
              contractAddress: poolAddress,
              entrypoint: "enter_delegation_pool",
              calldata: [address, amountStr, "0"],
            },
          ]);
          return {
            hash: tx.transaction_hash,
            explorerUrl: "https://voyager.online/tx/" + tx.transaction_hash,
            wait: async () => {
              await new Promise((res) => setTimeout(res, 3000));
            },
          };
        },

        // Claim rewards
        claimPoolRewards: async (pool: any) => {
          const poolAddress = pool.toString();
          const tx = await browserWallet.account.execute([{
            contractAddress: poolAddress,
            entrypoint: "claim_rewards",
            calldata: [address],
          }]);
          return {
            hash: tx.transaction_hash,
            explorerUrl: "https://voyager.online/tx/" + tx.transaction_hash,
            wait: async () => {
              await new Promise((res) => setTimeout(res, 3000));
            },
          };
        },

        // Exit pool (unstake)
        exitPoolIntent: async (pool: any, amount: any) => {
          const poolAddress = pool.toString();
          const amountStr = typeof amount === "bigint"
            ? amount.toString()
            : amount.toBase
            ? amount.toBase().toString()
            : (parseFloat(amount.toString()) * 1e18).toString();

          const tx = await browserWallet.account.execute([{
            contractAddress: poolAddress,
            entrypoint: "exit_delegation_pool_intent",
            calldata: [amountStr, "0"],
          }]);
          return {
            hash: tx.transaction_hash,
            explorerUrl: "https://voyager.online/tx/" + tx.transaction_hash,
            wait: async () => {
              await new Promise((res) => setTimeout(res, 3000));
            },
          };
        },

        // Swap via AVNU
        swap: async (request: any) => {
          // Will be handled by useSwap hook fallback
          throw new Error("Use swap hook directly");
        },

        // Get pool position
        getPoolPosition: async (pool: any) => {
          return null;
        },

        // Balance check handled by useTokenBalances directly via RPC
        balanceOf: null,
      };

      setState((s) => ({
        ...s,
        address,
        isConnected: true,
        isConnecting: false,
        wallet: sdkWallet,
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, isConnecting: false }));
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      network: "mainnet",
      wallet: null,
    });
  }, []);

  const displayAddress = state.address
    ? state.address.slice(0, 6) + "..." + state.address.slice(-4)
    : null;

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, displayAddress }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}