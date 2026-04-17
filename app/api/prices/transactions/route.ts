import { NextRequest, NextResponse } from "next/server";

const STARKSCAN_BASE = "https://api.starkscan.co/api/v0";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    // Starkscan transactions endpoint - no API key needed for basic usage
    const res = await fetch(
      `${STARKSCAN_BASE}/transactions?contract_address=${address}&order_by=desc&limit=30`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "ZapVault/1.0",
        },
        next: { revalidate: 30 }, // cache 30s
      }
    );

    if (!res.ok) {
      // Fallback: try Voyager
      const voyagerRes = await fetch(
        `https://api.voyager.online/beta/txns?contract=${address}&ps=30&p=1`,
        { headers: { "Accept": "application/json" } }
      );
      if (!voyagerRes.ok) throw new Error("Both APIs failed");
      const data = await voyagerRes.json();
      return NextResponse.json(data);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}