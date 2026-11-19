# Public interfaces and supported assets

## Listing extension v1

Base NIP-99 tags: `d`, `title`, `price` (`amount`, `USD`), `t` category, `status`, `location`, `published_at` and `image`. The additional tag is `["aislezero", "1", canonicalJson]`. `packages/commerce/schema.ts` is authoritative. Supported fields include SKU, brand, condition, stock, shipping destinations/charge, tax, dispatch estimate, returns, warranty, media alt text, supported asset IDs, receiving addresses, variants, specifications, wholesale MOQ, price tiers, customization and collection. Exact decimal amounts are strings. Signed object keys are canonically sorted.

Storefronts are signed kind 0 events. Private orders are NIP-17 content objects `{type:"aislezero:order",order:...}`. Offers use `aislezero:offer`. Public RFQs use application-specific kind 30410, `d`, `t=aislezero-rfq`, and `expiration` tags; quotations are private messages. These application extensions are not represented as universal Nostr standards.

Membership credentials use kind 30078 and `d=aislezero:membership:<merchant pubkey>`. Fields: version, merchant, subscriptionId (intent hash), network, transaction, issuedAt, expiresAt, issuer. Payment requests use kind 30078 and `d=aislezero:payment:<order UUID>`. Issuer quotes use `d=aislezero:subscription-quote:<UUID>`. Only configured issuer public keys can grant membership.

## Allowlist

| Asset | Network                   | Decimals | Contract or mint                               |
| ----- | ------------------------- | -------- | ---------------------------------------------- |
| BTC   | Bitcoin mainnet           | 8        | Native                                         |
| ETH   | Ethereum, chain 1         | 18       | Native                                         |
| BNB   | BNB Smart Chain, chain 56 | 18       | Native                                         |
| SOL   | Solana mainnet            | 9        | Native                                         |
| USDC  | Ethereum                  | 6        | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`   |
| USDT  | Ethereum                  | 6        | `0xdAC17F958D2ee523a2206206994597C13D831ec7`   |
| USDC  | Solana                    | 6        | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDT  | Solana                    | 6        | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

Circle's published USDC table does not identify a native BNB Smart Chain deployment. Tether's BNB section currently lists XAUt rather than a USDt contract. This client therefore excludes BNB stablecoins, including Binance-pegged representations. Recheck official issuer sources before every mainnet release. Asset names alone never authorize a contract.

Confirmation policies: 12 Ethereum blocks, 15 BNB blocks, finalized Solana, 6 Bitcoin blocks. These are software policies, not guarantees against chain reorganization. Rates come from CoinGecko with maximum source age 5 minutes. Quotes round upward to the next base unit. There are no automatic swaps, bridges or token allowance requests. The wallet displays network costs; the app does not yet provide a pre-wallet gas/rent quote.

Wallet compatibility: EIP-6963 / EIP-1193 providers with network switching and sendTransaction; Solana Wallet Standard with `standard:connect` and `solana:signAndSendTransaction`; UniSat-compatible native SegWit or single-key Taproot PSBT wallets. Bitcoin signing constructs outputs for the merchant, exact OP_RETURN commitment and wallet change. The fee policy is conservative and requires sufficient confirmed funds and a change output. Unsupported Bitcoin account types fail explicitly. NIP-46 supports bunker URLs. No WalletConnect mobile connector is bundled.

## Standards and primary sources reviewed

- [NIP-99 classified listings](https://github.com/nostr-protocol/nips/blob/master/99.md)
- [NIP-17 private messages](https://github.com/nostr-protocol/nips/blob/master/17.md)
- [Nostr Tools](https://github.com/nbd-wtf/nostr-tools)
- [Circle USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)
- [Tether supported protocols](https://tether.to/en/supported-protocols/)
- [Solana Kit](https://github.com/anza-xyz/kit)
- [Solana Token transferChecked source](https://github.com/solana-program/token/blob/main/clients/js/src/generated/instructions/transferChecked.ts)
- [Viem receipt verification](https://viem.sh/docs/actions/public/getTransactionReceipt)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Dependencies are locked in package-lock.json. Nostr Tools is Unlicense, React/Vite/Viem/Zod/MiniSearch/Lucide/Decimal.js/Scure/Wallet Standard use permissive code licenses; Solana Kit uses MIT; Fontsource fonts include Inter and Space Grotesk OFL font licenses. Keep upstream notices with redistributed assets. Automated dependency scanning is not a commercial-license or security audit.
