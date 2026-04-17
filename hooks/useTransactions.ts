"use client";

import { useState, useEffect, useCallback } from "react";

const RPC_URL = "https://api.cartridge.gg/x/starknet/mainnet";

// Known contract addresses for type detection
const KNOWN_CONTRACTS: Record<string, string> = {
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d": "STRK",
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7": "ETH",
  "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8": "USDC",
  "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8": "USDT",
  "0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7": "STAKING",
};

const ENTRYPOINT_TYPES: Record<string, { type: string; label: string; color: string }> = {
  "transfer": { type: "transfer", label: "Transfer", color: "text-blue-400" },
  "approve": { type: "approve", label: "Approve", color: "text-yellow-400" },
  "enter_delegation_pool": { type: "stake", label: "Stake", color: "text-green-400" },
  "add_to_delegation_pool": { type: "stake", label: "Add Stake", color: "text-green-400" },
  "exit_delegation_pool_intent": { type: "unstake", label: "Unstake Intent", color: "text-orange-400" },
  "exit_delegation_pool_action": { type: "unstake", label: "Unstake", color: "text-orange-400" },
  "claim_rewards": { type: "rewards", label: "Claim Rewards", color: "text-purple-400" },
  "multi_route_swap": { type: "swap", label: "Swap", color: "text-cyan-400" },
  "swap": { type: "swap", label: "Swap", color: "text-cyan-400" },
  "deposit": { type: "bridge", label: "Bridge Deposit", color: "text-pink-400" },
  "withdraw": { type: "bridge", label: "Bridge Withdraw", color: "text-pink-400" },
};

export interface Transaction {
  hash: string;
  type: string;
  label: string;
  color: string;
  timestamp: number;
  status: "success" | "failed" | "pending";
  contractAddress: string;
  contractName: string;
  entrypoint: string;
  explorerUrl: string;
}

async function rpcCall(method: string, params: any[]) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export function useTransactions(address: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);

    try {
      // Use starknet_getEvents to find all transactions from this address
      // We look for Transfer events and execute calls involving our address
      const result = await rpcCall("starknet_getEvents", [{
        address: address,
        from_block: { block_number: 0 },
        to_block: "latest",
        chunk_size: 50,
      }]);

      const txHashes = new Set<string>();
      if (result?.events) {
        result.events.forEach((e: any) => {
          if (e.transaction_hash) txHashes.add(e.transaction_hash);
        });
      }

      // Also fetch transactions sent FROM this address via Voyager API
      let voyagerTxs: any[] = [];
      try {
        const voyagerRes = await fetch(
          `https://api.voyager.online/beta/txns?to=${address}&ps=30&p=1`,
          { headers: { "Accept": "application/json" } }
        );
        if (voyagerRes.ok) {
          const voyagerData = await voyagerRes.json();
          voyagerTxs = voyagerData?.items ?? [];
        }
      } catch {
        // Voyager API fallback failed — use RPC only
      }

      // Process Voyager transactions
      const processed: Transaction[] = voyagerTxs.map((tx: any) => {
        const entrypoint = tx.entry_point_selector_name?.toLowerCase() ?? "";
        const contractAddr = (tx.contract_address ?? "").toLowerCase();
        const typeInfo = ENTRYPOINT_TYPES[entrypoint] ?? {
          type: "contract",
          label: entrypoint || "Contract Call",
          color: "text-zap-subtext",
        };
        const contractName = KNOWN_CONTRACTS[contractAddr] ?? contractAddr.slice(0, 8) + "...";

        return {
          hash: tx.transaction_hash ?? tx.hash ?? "",
          type: typeInfo.type,
          label: typeInfo.label,
          color: typeInfo.color,
          timestamp: tx.timestamp ?? 0,
          status: tx.status === "Rejected" || tx.revert_error ? "failed" : "success",
          contractAddress: contractAddr,
          contractName,
          entrypoint,
          explorerUrl: `https://voyager.online/tx/${tx.transaction_hash ?? tx.hash}`,
        };
      });

      setTransactions(processed);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) fetchTransactions();
  }, [address, fetchTransactions]);

  return { transactions, isLoading, error, refetch: fetchTransactions };
}