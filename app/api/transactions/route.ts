import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    // Use Voyager API - designed for wallet transaction history
    const res = await fetch(
      `https://voyager.online/api/txns?contract=${address}&ps=20&p=1`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "ZapVault/1.0",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      throw new Error(`Voyager API returned ${res.status}`);
    }

    const data = await res.json();
    const rawTxns = data?.items ?? data?.data ?? [];

    if (rawTxns.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const ENTRYPOINT_MAP: Record<string, { label: string; type: string; color: string }> = {
      "transfer": { label: "Transfer", type: "transfer", color: "text-blue-400" },
      "approve": { label: "Approve", type: "approve", color: "text-yellow-400" },
      "enter_delegation_pool": { label: "Stake", type: "stake", color: "text-green-400" },
      "add_to_delegation_pool": { label: "Add Stake", type: "stake", color: "text-green-400" },
      "exit_delegation_pool_intent": { label: "Unstake", type: "unstake", color: "text-orange-400" },
      "claim_rewards": { label: "Claim Rewards", type: "rewards", color: "text-purple-400" },
      "multi_route_swap": { label: "Swap", type: "swap", color: "text-cyan-400" },
      "swap_exact_token_to": { label: "Swap", type: "swap", color: "text-cyan-400" },
      "deposit": { label: "Bridge", type: "bridge", color: "text-pink-400" },
    };

    const KNOWN_CONTRACTS: Record<string, string> = {
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d": "STRK",
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7": "ETH",
      "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8": "USDC",
      "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8": "USDT",
      "0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7": "Staking",
      "0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f": "AVNU",
    };

    const transactions = rawTxns.map((tx: any) => {
      const entrypoint = (
        tx.entry_point_selector_name ??
        tx.entrypoint_name ??
        tx.function_name ??
        ""
      ).toLowerCase();

      const contractAddr = (
        tx.contract_address ??
        tx.to ??
        ""
      ).toLowerCase();

      const typeInfo = ENTRYPOINT_MAP[entrypoint] ?? {
        label: entrypoint ? entrypoint.replace(/_/g, " ") : "Contract Call",
        type: "contract",
        color: "text-zap-subtext",
      };

      const contractName = KNOWN_CONTRACTS[contractAddr] ?? contractAddr.slice(0, 8) + "...";
      const hash = tx.transaction_hash ?? tx.hash ?? "";

      return {
        hash,
        type: typeInfo.type,
        label: typeInfo.label,
        color: typeInfo.color,
        timestamp: tx.timestamp ?? tx.block_timestamp ?? 0,
        status: tx.status === "Rejected" || tx.execution_status === "REVERTED" ? "failed" : "success",
        contractAddress: contractAddr,
        contractName,
        entrypoint,
        explorerUrl: `https://voyager.online/tx/${hash}`,
      };
    });

    return NextResponse.json({ items: transactions });
  } catch (e: any) {
    console.error("Transaction fetch error:", e.message);
    return NextResponse.json({ error: e.message, items: [] }, { status: 500 });
  }
}