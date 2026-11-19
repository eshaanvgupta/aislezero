import type { AssetId } from "../commerce/schema";
export interface Asset {
  id: AssetId;
  symbol: string;
  network: "ethereum" | "bnb" | "solana" | "bitcoin";
  decimals: number;
  contract?: string;
  chainId?: number;
  confirmations: number;
  rateId: string;
}
// Issuer sources and exclusions are recorded in docs/PROTOCOL.md. No Binance-pegged stablecoins.
export const assets: Asset[] = [
  {
    id: "BTC:bitcoin",
    symbol: "BTC",
    network: "bitcoin",
    decimals: 8,
    confirmations: 6,
    rateId: "bitcoin",
  },
  {
    id: "ETH:ethereum",
    symbol: "ETH",
    network: "ethereum",
    chainId: 1,
    decimals: 18,
    confirmations: 12,
    rateId: "ethereum",
  },
  {
    id: "BNB:bnb",
    symbol: "BNB",
    network: "bnb",
    chainId: 56,
    decimals: 18,
    confirmations: 15,
    rateId: "binancecoin",
  },
  {
    id: "SOL:solana",
    symbol: "SOL",
    network: "solana",
    decimals: 9,
    confirmations: 1,
    rateId: "solana",
  },
  {
    id: "USDC:ethereum",
    symbol: "USDC",
    network: "ethereum",
    chainId: 1,
    decimals: 6,
    contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    confirmations: 12,
    rateId: "usd-coin",
  },
  {
    id: "USDT:ethereum",
    symbol: "USDT",
    network: "ethereum",
    chainId: 1,
    decimals: 6,
    contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    confirmations: 12,
    rateId: "tether",
  },
  {
    id: "USDC:solana",
    symbol: "USDC",
    network: "solana",
    decimals: 6,
    contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    confirmations: 1,
    rateId: "usd-coin",
  },
  {
    id: "USDT:solana",
    symbol: "USDT",
    network: "solana",
    decimals: 6,
    contract: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    confirmations: 1,
    rateId: "tether",
  },
];
export function getAsset(id: string): Asset {
  const a = assets.find((a) => a.id === id);
  if (!a)
    throw new Error(
      "Unsupported asset or network. Token names alone are never trusted.",
    );
  return a;
}
