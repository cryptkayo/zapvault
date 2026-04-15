"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { sdk } from "@/lib/sdk";

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

      let sdkWallet = null;
      try {
        const signer = {
          getPubKey: async () => browserWallet.account?.signer?.getPubKey?.() ?? address,
          signRaw: async (hash: string) =>
            (await browserWallet.account?.signer?.signRaw?.(hash)) ??
            (await browserWallet.account?.signMessage?.(hash)),
        };
        sdkWallet = await (sdk as any).connectWallet({ account: { signer } });
      } catch (sdkErr) {
        console.warn("SDK wallet connection failed:", sdkErr);
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