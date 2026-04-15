import { StarkZap } from "starkzap";

export const sdk = new StarkZap({
  network: "mainnet",
  paymaster: {
    default: true,
  },
  bridging: {
    ethereumRpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL,
  },
});

export const sepoliaSDK = new StarkZap({
  network: "sepolia",
  paymaster: {
    default: true,
  },
});

export const NETWORKS = {
  mainnet: {
    name: "Mainnet",
    chainId: "SN_MAIN",
    explorer: "https://voyager.online",
    rpc: "https://api.cartridge.gg/x/starknet/mainnet",
  },
  sepolia: {
    name: "Sepolia",
    chainId: "SN_SEPOLIA",
    explorer: "https://sepolia.voyager.online",
    rpc: "https://api.cartridge.gg/x/starknet/sepolia",
  },
} as const;

export type NetworkName = keyof typeof NETWORKS;

export const TOKENS = {
  ETH: {
    address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    coingeckoId: "ethereum",
    color: "#627EEA",
  },
  STRK: {
    address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    symbol: "STRK",
    name: "Starknet Token",
    decimals: 18,
    coingeckoId: "starknet",
    color: "#00D4FF",
  },
  USDC: {
    address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coingeckoId: "usd-coin",
    color: "#2775CA",
  },
  USDT: {
    address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    coingeckoId: "tether",
    color: "#26A17B",
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;

