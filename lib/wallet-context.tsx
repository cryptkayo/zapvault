"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { WalletState } from "@/types";

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
    isDemoMode: false,
  });

  const connect = useCallback(async (walletType: "argent" | "braavos" | "cartridge") => {
    setState((s) => ({ ...s, isConnecting: true }));
    try {
      const starknetArgent = (window as any).starknet_argentX;
      const starknetBraavos = (window as any).starknet_braavos;
      const starknetFallback = (window as any).starknet;

      const wallet =
        walletType === "argent"
          ? starknetArgent || starknetFallback
          : walletType === "braavos"
          ? starknetBraavos || starknetFallback
          : starknetFallback;

      if (!wallet) {
        throw new Error("Wallet not found. Please install the browser extension.");
      }

      await wallet.enable({ starknetVersion: "v5" });

      const address = wallet.account?.address || wallet.selectedAddress;

      setState((s) => ({
        ...s,
        address,
        isConnected: true,
        isConnecting: false,
        isDemoMode: false,
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
      isDemoMode: false,
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