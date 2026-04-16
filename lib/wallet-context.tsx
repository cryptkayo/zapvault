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

let globalAccount: any = null;

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
      const w = (window as any);
      const browserWallet =
        walletType === "argent"
          ? w.starknet_argentX || w.starknet
          : walletType === "braavos"
          ? w.starknet_braavos || w.starknet
          : w.starknet;

      if (!browserWallet) throw new Error("Wallet not found. Please install the browser extension.");

      await browserWallet.enable({ starknetVersion: "v5" });
      
      globalAccount = browserWallet.account;
      const address = browserWallet.account?.address || browserWallet.selectedAddress;

      console.log("Wallet connected. Account:", globalAccount, "Address:", address);

      const wallet = {
        address,
        browserAccount: globalAccount,
        getAccount: () => globalAccount,
      };

      setState((s) => ({
        ...s,
        address,
        isConnected: true,
        isConnecting: false,
        wallet,
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, isConnecting: false }));
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    globalAccount = null;
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