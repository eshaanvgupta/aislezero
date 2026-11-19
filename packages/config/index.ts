const env = import.meta.env || {};
export const config = {
  relays: String(
    env.VITE_RELAYS ||
      "wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net",
  )
    .split(",")
    .filter(Boolean),
  searchRelays: String(env.VITE_SEARCH_RELAYS || "wss://relay.nostr.band")
    .split(",")
    .filter(Boolean),
  issuers: String(env.VITE_TRUSTED_ISSUERS || "")
    .split(",")
    .filter(Boolean),
  operator: env.VITE_OPERATOR_PUBKEY || "",
  issuerUrl: env.VITE_ISSUER_URL || "",
  paymentsEnabled: env.VITE_PAYMENTS_ENABLED === "true",
  rpc: {
    ethereum: env.VITE_ETH_RPC || "https://ethereum-rpc.publicnode.com",
    bnb: env.VITE_BNB_RPC || "https://bsc-rpc.publicnode.com",
    solana: env.VITE_SOL_RPC || "https://api.mainnet-beta.solana.com",
    bitcoin: env.VITE_BTC_API || "https://blockstream.info/api",
  },
  annualUsd: "125",
  version: 1,
};
export const categories = [
  {
    slug: "home-living",
    name: "Home & living",
    detail: "Objects with a story",
    icon: "home",
  },
  {
    slug: "fashion",
    name: "Fashion",
    detail: "Find your own style",
    icon: "shirt",
  },
  {
    slug: "electronics",
    name: "Electronics",
    detail: "Tools for the everyday",
    icon: "headphones",
  },
  {
    slug: "vintage",
    name: "Vintage & collectibles",
    detail: "A little out of the ordinary",
    icon: "watch",
  },
  {
    slug: "art-craft",
    name: "Art & craft",
    detail: "Made with intention",
    icon: "palette",
  },
  {
    slug: "outdoors",
    name: "Outdoors",
    detail: "For your next adventure",
    icon: "tent",
  },
];
export const prohibited = [
  "weapons",
  "stolen-goods",
  "counterfeit",
  "illegal-drugs",
  "exploitation",
];
