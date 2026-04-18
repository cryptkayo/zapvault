"use client";

import { useState, useCallback, useEffect } from "react";

export interface Transaction {
  hash: string;
  type: string;
  label: string;
  color: string;
  timestamp: number;
  status: "success" | "failed";
  contractName: string;
  explorerUrl: string;
}

const STORAGE_KEY = "zapvault_transactions";

function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTransactions(txs: Transaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  } catch { /* ignore */ }
}

export function addTransaction(tx: Omit<Transaction, "timestamp" | "explorerUrl">) {
  const transactions = loadTransactions();
  const newTx: Transaction = {
    ...tx,
    timestamp: Date.now(),
    explorerUrl: `https://voyager.online/tx/${tx.hash}`,
  };
  // Add to front, keep last 50
  const updated = [newTx, ...transactions].slice(0, 50);
  saveTransactions(updated);
  // Dispatch event so ActivityTab re-renders
  window.dispatchEvent(new Event("zapvault_tx_added"));
  return newTx;
}

export function useTransactions(address: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = useCallback(() => {
    setTransactions(loadTransactions());
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("zapvault_tx_added", load);
    return () => window.removeEventListener("zapvault_tx_added", load);
  }, [load]);

  const clearTransactions = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTransactions([]);
  }, []);

  return {
    transactions,
    isLoading: false,
    error: null,
    refetch: load,
    clearTransactions,
  };
}