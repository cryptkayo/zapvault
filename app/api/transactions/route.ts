import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const RPC_URL = "https://api.cartridge.gg/x/starknet/mainnet";

  // Transfer event key (keccak256 of "Transfer")
  const TRANSFER_KEY = "0x0099cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9";

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

  try {
    const seenHashes = new Set<string>();
    const allEvents: any[] = [];

    // Fetch Transfer events sent FROM this address
    try {
      const sent = await rpcCall("starknet_getEvents", [{
        from_block: { block_number: 0 },
        to_block: "latest",
        keys: [[TRANSFER_KEY], [address]],
        chunk_size: 15,
      }]);
      (sent?.events ?? []).forEach((e: any) => {
        if (!seenHashes.has(e.transaction_hash)) {
          seenHashes.add(e.transaction_hash);
          allEvents.push({ ...e, direction: "sent" });
        }
      });
    } catch { /* ignore */ }

    // Fetch Transfer events received BY this address
    try {
      const received = await rpcCall("starknet_getEvents", [{
        from_block: { block_number: 0 },
        to_block: "latest",
        keys: [[TRANSFER_KEY], [], [address]],
        chunk_size: 15,
      }]);
      (received?.events ?? []).forEach((e: any) => {
        if (!seenHashes.has(e.transaction_hash)) {
          seenHashes.add(e.transaction_hash);
          allEvents.push({ ...e, direction: "received" });
        }
      });
    } catch { /* ignore */ }

    // For each unique tx hash, fetch the full transaction to get entrypoint
    const limited = allEvents.slice(0, 20);
    const txDetails = await Promise.allSettled(
      limited.map((e) =>
        rpcCall("starknet_getTransactionByHash", [e.transaction_hash])
      )
    );

    // Fetch block timestamps
    const blockNumbers = Array.from(new Set(limited.map((e) => e.block_number).filter(Boolean)));
    const blockTimestamps: Record<number, number> = {};
    await Promise.allSettled(
      blockNumbers.slice(0, 10).map(async (bn) => {
        try {
          const block = await rpcCall("starknet_getBlockWithTxHashes", [{ block_number: bn }]);
          blockTimestamps[bn] = block?.timestamp ?? 0;
        } catch { /* ignore */ }
      })
    );

    const KNOWN_CONTRACTS: Record<string, string> = {
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d": "STRK Token",
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7": "ETH Token",
      "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8": "USDC Token",
      "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8": "USDT Token",
      "0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7": "Staking Contract",
    };

    const ENTRYPOINT_LABELS: Record<string, { label: string; type: string; color: string }> = {
      "transfer": { label: "Transfer", type: "transfer", color: "text-blue-400" },
      "enter_delegation_pool": { label: "Stake", type: "stake", color: "text-green-400" },
      "add_to_delegation_pool": { label: "Add Stake", type: "stake", color: "text-green-400" },
      "exit_delegation_pool_intent": { label: "Unstake Intent", type: "unstake", color: "text-orange-400" },
      "claim_rewards": { label: "Claim Rewards", type: "rewards", color: "text-purple-400" },
      "multi_route_swap": { label: "Swap", type: "swap", color: "text-cyan-400" },
      "swap_exact_token_to": { label: "Swap", type: "swap", color: "text-cyan-400" },
      "deposit": { label: "Bridge In", type: "bridge", color: "text-pink-400" },
      "approve": { label: "Approve", type: "approve", color: "text-yellow-400" },
    };

    const transactions = limited.map((event, i) => {
      const txDetail = txDetails[i].status === "fulfilled" ? txDetails[i].value : null;
      
      // Try to get entrypoint from transaction calldata
      const calls = txDetail?.calldata ?? [];
      const contractAddr = (event.from_address ?? "").toLowerCase();
      const contractName = KNOWN_CONTRACTS[contractAddr] ?? contractAddr.slice(0, 8) + "...";
      const timestamp = blockTimestamps[event.block_number] ?? 0;

      // Determine type from direction
      const isSent = event.direction === "sent";
      const typeInfo = isSent
        ? { label: "Send", type: "transfer", color: "text-blue-400" }
        : { label: "Receive", type: "receive", color: "text-green-400" };

      return {
        hash: event.transaction_hash,
        type: typeInfo.type,
        label: typeInfo.label,
        color: typeInfo.color,
        timestamp,
        status: "success",
        contractAddress: contractAddr,
        contractName,
        entrypoint: "transfer",
        explorerUrl: `https://voyager.online/tx/${event.transaction_hash}`,
      };
    });

    // Sort by timestamp descending
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ items: transactions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, items: [] }, { status: 500 });
  }
}