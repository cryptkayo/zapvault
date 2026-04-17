"use client";

import { useState, useEffect, useCallback } from "react";

const RPC_URL = "https://api.cartridge.gg/x/starknet/mainnet";

// Transfer event selector (keccak of "Transfer")
const TRANSFER_KEY = "0x0099cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9";

const KNOWN_CONTRACTS: Record<string, string> = {
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d": "STRK Token",
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7": "ETH Token",
  "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8": "USDC Token",
  "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8": "USDT Token",
  "0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7": "Staking Contract",
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
  "swap_exact_token_to": { type: "swap", label: "Swap", color: "text-cyan-400" },
  "swap": { type: "swap", label: "Swap", color: "text-cyan-400" },
  "deposit": { type: "bridge", label: "Bridge In", color: "text-pink-400" },
  "withdraw": { type: "bridge", label: "Bridge Out", color: "text-pink-400" },
  "__execute__": { type: "execute", label: "Execute", color: "text-zap-subtext" },
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

async function getBlockTimestamp(blockNumber: number): Promise<number> {
  try {
    const block = await rpcCall("starknet_getBlockWithTxHashes", [
      { block_number: blockNumber }
    ]);
    return block?.timestamp ?? 0;
  } catch {
    return 0;
  }
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
      // Try our API proxy first (Starkscan)
      let txs: Transaction[] = [];

      try {
        const res = await fetch(`/api/transactions?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          // Starkscan format
          const items = data?.data ?? data?.items ?? [];
          if (items.length > 0) {
            txs = items.map((tx: any) => {
              const entrypoint = (
                tx.entry_point_selector_name ??
                tx.function_name ??
                tx.entrypoint ??
                ""
              ).toLowerCase().replace(/^0x[0-9a-f]+$/, "");

              const contractAddr = (
                tx.contract_address ??
                tx.to ??
                ""
              ).toLowerCase();

              const typeInfo = ENTRYPOINT_TYPES[entrypoint] ?? {
                type: "contract",
                label: entrypoint ? entrypoint.replace(/_/g, " ") : "Contract Call",
                color: "text-zap-subtext",
              };

              const contractName =
                KNOWN_CONTRACTS[contractAddr] ??
                (contractAddr ? contractAddr.slice(0, 8) + "..." : "Unknown");

              const hash = tx.transaction_hash ?? tx.hash ?? "";

              return {
                hash,
                type: typeInfo.type,
                label: typeInfo.label,
                color: typeInfo.color,
                timestamp: tx.timestamp ?? tx.block_timestamp ?? 0,
                status: (tx.status === "Rejected" || tx.revert_error || tx.execution_status === "REVERTED")
                  ? "failed"
                  : "success",
                contractAddress: contractAddr,
                contractName,
                entrypoint,
                explorerUrl: `https://voyager.online/tx/${hash}`,
              } as Transaction;
            });
          }
        }
      } catch {
        // proxy failed, fall through to RPC
      }

      // Fallback: use starknet_getEvents via RPC to find Transfer events involving this address
      if (txs.length === 0) {
        const seenHashes = new Set<string>();

        // Get events where address is sender (key[1]) or receiver (key[2])
        const [sentEvents, receivedEvents] = await Promise.allSettled([
          rpcCall("starknet_getEvents", [{
            from_block: { block_number: 0 },
            to_block: "latest",
            keys: [[TRANSFER_KEY], [address]],
            chunk_size: 20,
          }]),
          rpcCall("starknet_getEvents", [{
            from_block: { block_number: 0 },
            to_block: "latest",
            keys: [[TRANSFER_KEY], [], [address]],
            chunk_size: 20,
          }]),
        ]);

        const allEvents: any[] = [];
        if (sentEvents.status === "fulfilled") allEvents.push(...(sentEvents.value?.events ?? []));
        if (receivedEvents.status === "fulfilled") allEvents.push(...(receivedEvents.value?.events ?? []));

        // Deduplicate by tx hash
        const uniqueEvents = allEvents.filter((e) => {
          if (seenHashes.has(e.transaction_hash)) return false;
          seenHashes.add(e.transaction_hash);
          return true;
        });

        // Fetch timestamps in parallel (limit to 10)
        const limited = uniqueEvents.slice(0, 10);
        const timestampPromises = limited.map((e) =>
          e.block_number ? getBlockTimestamp(e.block_number) : Promise.resolve(0)
        );
        const timestamps = await Promise.all(timestampPromises);

        txs = limited.map((e, i) => {
          const contractAddr = (e.from_address ?? "").toLowerCase();
          const contractName = KNOWN_CONTRACTS[contractAddr] ?? contractAddr.slice(0, 8) + "...";
          const isSent = e.keys?.[1]?.toLowerCase() === address.toLowerCase();

          return {
            hash: e.transaction_hash ?? "",
            type: "transfer",
            label: isSent ? "Send" : "Receive",
            color: isSent ? "text-blue-400" : "text-green-400",
            timestamp: timestamps[i],
            status: "success",
            contractAddress: contractAddr,
            contractName,
            entrypoint: "transfer",
            explorerUrl: `https://voyager.online/tx/${e.transaction_hash}`,
          } as Transaction;
        });

        // Sort by timestamp desc
        txs.sort((a, b) => b.timestamp - a.timestamp);
      }

      setTransactions(txs);
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