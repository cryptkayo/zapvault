export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  raw: bigint;
  formatted: string;
  usdValue: number;
  color: string;
  change24h?: number;
}

export interface StakingPool {
  id: string;
  name: string;
  validator: string;
  apy: number;
  totalStaked: string;
  myStaked: string;
  myRewards: string;
  status: "active" | "inactive";
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  priceImpact: number;
  route: string[];
  estimatedGas: string;
  expiresAt: number;
}

export interface BridgeToken {
  symbol: string;
  name: string;
  address: string;
  logoUrl?: string;
  chains: string[];
}

export interface BridgeQuote {
  fromChain: string;
  toChain: string;
  token: string;
  amount: string;
  estimatedFee: string;
  estimatedTime: string;
  route: string;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: "mainnet" | "sepolia";
  isDemoMode: boolean;
}

export type TabId = "portfolio" | "earn" | "trade" | "deposit" | "activity";