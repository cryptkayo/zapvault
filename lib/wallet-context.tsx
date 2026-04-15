"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { sdk } from "@/lib/sdk";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: "mainnet" | "sepolia";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any | null;
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

      // Connect wallet through Starkzap SDK using the browser wallet's signer
      let sdkWallet = null;
      try {
        const { StarkSigner } = await import("starkzap");
        // Use the browser wallet account directly as signer
        const signer = {
          getPubKey: async () => {
            return browserWallet.account?.signer?.getPubKey?.() ?? address;
          },
          signRaw: async (hash: string) => {
            return browserWallet.account?.signer?.signRaw?.(hash) ??
              browserWallet.account?.signMessage?.(hash);
          },
        };

        // @ts-ignore
        sdkWallet = await sdk.connectWallet({
          account: {
            signer,
          },
          accountAddress: address,
        });
      } catch (sdkErr) {
        console.warn("SDK wallet connection failed, using browser wallet directly:", sdkErr);
        // Fallback: use browser wallet account directly
        sdkWallet = browserWallet.account;
      }

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