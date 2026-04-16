import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,starknet,usd-coin,tether&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      ethereum: { usd: 1600, usd_24h_change: 0 },
      starknet: { usd: 0.034, usd_24h_change: 0 },
      "usd-coin": { usd: 1.0, usd_24h_change: 0.0 },
      tether: { usd: 1.0, usd_24h_change: 0.0 },
    });
  }
}