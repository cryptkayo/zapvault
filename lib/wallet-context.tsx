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

// Store browser wallet reference globally so it persists
let globalBrowserWallet: any = null;

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
      
      // Store globally for later use
      globalBrowserWallet = browserWallet;
      
      const address = browserWallet.account?.address || browserWallet.selectedAddress;

      console.log("Connected wallet account:", browserWallet.account);
      console.log("Connected wallet address:", address);

      const sdkWallet = {
        address,

        // Transfer tokens - uses globalBrowserWallet to always get fresh account
        transfer: async (token: any, transfers: any[]) => {
          const account = globalBrowserWallet?.account;
          if (!account) throw new Error("No account available");
          
          const recipient = transfers[0].to.toString();
          const amount = transfers[0].amount;
          const amountStr = typeof amount === "bigint"
            ? amount.toString()
            : amount.toBase
            ? amount.toBase().toString()
            : amount.toString();

          const tokenAddress = token.address ?? token.toString();

          console.log("Executing transfer:", { tokenAddress, recipient, amountStr });

          const tx = await account.execute([{
            contractAddress: tokenAddress,
            entrypoint: "transfer",
            calldata: [recipient, amountStr, "0"],
          }]);
          
          return {
            hash: tx.transaction_hash,
            explorerUrl: "https://voyager.online/tx/" + tx.transaction_hash,
            wait: async () => {
              await new Promise((res) => setTimeout(res, 3000));
            },
          };
        },

        // Stake STRK
        stake: async (pool: any, amount: any) => {
          const account = globalBrowserWallet?.account;
          if (!account) throw new Error("No account available");

          const STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
          const poolAddress = pool.toString();
          const amountBig = typeof amount === "bigint"
            ? amount
            : amount.toBase
            ? amount.toBase()
            : BigInt(Math.floor(parseFloat(amount.toString()) * 1e18));

          const amountLow = (amountBig & BigInt("0xffffffffffffffffffffffffffffffff")).toString();
          const amountHigh = (amountBig >> BigInt(128)).toString();

          console.log("Executing stake:", { poolAddress, amountLow, amountHigh });

          const tx = await account.execute([
            {
              contractAddress: STRK_ADDRESS,
              entrypoint: "approve",
              calldata: [poolAddress, amountLow, amountHigh],
            },
            {
              contractAddress: poolAddress,
              entrypoint: "enter_delegation_pool",
              calldata: [address, amountLow, amountHigh],
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
          const account = globalBrowserWallet?.account;
          if (!account) throw new Error("No account available");

          const poolAddress = pool.toString();
          const tx = await account.execute([{
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
          const account = globalBrowserWallet?.account;
          if (!account) throw new Error("No account available");

          const poolAddress = pool.toString();
          const amountBig = typeof amount === "bigint"
            ? amount
            : amount.toBase
            ? amount.toBase()
            : BigInt(Math.floor(parseFloat(amount.toString()) * 1e18));

          const amountLow = (amountBig & BigInt("0xffffffffffffffffffffffffffffffff")).toString();
          const amountHigh = (amountBig >> BigInt(128)).toString();

          const tx = await account.execute([{
            contractAddress: poolAddress,
            entrypoint: "exit_delegation_pool_intent",
            calldata: [amountLow, amountHigh],
          }]);

          return {
            hash: tx.transaction_hash,
            explorerUrl: "https://voyager.online/tx/" + tx.transaction_hash,
            wait: async () => {
              await new Promise((res) => setTimeout(res, 3000));
            },
          };
        },

        getPoolPosition: async () => null,
        balanceOf: null,
        swap: null,
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
    globalBrowserWallet = null;
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