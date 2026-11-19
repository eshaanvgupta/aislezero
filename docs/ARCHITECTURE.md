# AisleZero architecture

The delivered application is a React/TypeScript static client and a separately deployable stateless Cloudflare Worker. It contains no product database, customer database, custodial checkout service or media bucket. Production deployment currently exposes discovery and merchant tools with live payments disabled.

## Boundaries

| Module                   | Responsibility                                                                           | Persistence                                             |
| ------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/web`               | Shopping, merchant studio, wallet dialogs and private order workflows                    | Browser localStorage and IndexedDB                      |
| `packages/nostr`         | NIP-07 / NIP-46 signing; verified queries; acknowledgement-based publishing              | Independent configured Nostr relays                     |
| `packages/commerce`      | Versioned listing schemas, participant roles and lifecycle validation                    | Signed public listings / encrypted participant messages |
| `packages/messaging`     | NIP-17 rumors, NIP-44 seals and NIP-59 ephemeral envelopes                               | Participant inbox relays; decrypted browser cache       |
| `packages/payments`      | Exact integer amounts, asset allowlist, signed intents, independent receipt verification | Blockchain; local participant order records             |
| `packages/wallets`       | EIP-6963, Wallet Standard and UniSat PSBT adapters                                       | Wallet extensions; connections in memory                |
| `packages/subscriptions` | Trusted issuer credential validation and annual expiry                                   | Signed public issuer attestations                       |
| `packages/storage`       | File inspection and direct provider uploads                                              | Merchant's own provider                                 |
| `apps/edge`              | Quote issuance and subscription payment verification                                     | Stateless; no application database                      |

## Products and identity

Listings are NIP-99 kinds 30402 and 30403. The `content` remains a plain description compatible with NIP-99; additional commerce fields are in a versioned tag. Prices accepted by this client are USD references. Events are signature- and event-ID-verified, deduplicated and reconciled by addressable key. At least one positive relay acknowledgement is required before publication is reported successful. Partial replication is shown. Pausing publishes a signed inactive event and deletion request for the active address. Deletion cannot guarantee erasure.

Discovery requests a bounded page from each configured relay. The client indexes retrieved eligible listings with MiniSearch. It provides progressive earlier queries and NIP-50 remote search. Global completeness is never asserted. Membership is revalidated using configured issuer keys and confirmed validity timestamps. If no issuer is trusted, no merchant is eligible for marketplace discovery.

Profiles are signed kind 0 JSON. A payment wallet is distinct from the Nostr identity. EVM address-control challenges can be signed and exported. Solana/Bitcoin address ownership is merchant-stated in this release.

## Direct purchase lifecycle

Buyer requests are NIP-17 encrypted messages. The seller must confirm stock, accept the order and issue a seller-signed exact payment intent bound to the buyer, order UUID, recipient, asset/network, units and quote lifetime. Native EVM transactions contain a SHA-256 intent commitment in calldata. ERC20 transfers carry it after the ABI transfer arguments. Solana transfers include a memo instruction. Bitcoin PSBTs include a 32-byte OP_RETURN commitment.

No platform receiving address occurs in ordinary purchase construction. A submitted hash sets `submitted`, never `verified`. Independent chain verification checks recipient, asset contract/mint, exact units, commitment, confirmation/finality and block timestamp. Participants exchange verified status and merchant-reported fulfilment updates privately. Receipt commitment prevents reuse for another order; browser records also check duplicate transaction references. Shipping state is merchant-reported; buyer receipt confirmation is separate.

## Membership without a database

The optional issuer authenticates signed merchant quote requests. It signs a $125 quote containing a random intent ID, merchant identity and configured subscription treasury. A subscription uses the same reference-bound direct transfers as purchases, with purpose `subscription`. Claim verification uses independently configured mainnet RPC services. The issuer signs a public credential with expiry exactly 365 days after the transaction's confirmed block time.

No subscription contract or Solana program is deployed or required by this design. Bitcoin uses an OP_RETURN payment commitment instead of unique invoice addresses. The commitment includes the signed quote's merchant identity and unique intent, so a receipt cannot activate an unrelated identity. Reclaiming produces the same entitlement duration; it cannot extend membership. A claim may be submitted after quote expiry if settlement occurred within the quote window. Renewals begin at the new payment time, so early renewal does not carry unused time forward.

## Media and privacy

Pinata uploads go directly to the merchant account from the browser. HTTPS and Arweave-funded endpoint adapters require a merchant-provided multipart endpoint returning `{ "url": "https://..." }` with browser CORS. These are interfaces to merchant infrastructure, not a built-in funded Arweave service. Provider tokens stay in tab memory. Files are validated by signature, size and image dimensions and hashed locally. Originals are uploaded unchanged. IPFS availability requires pinning.

Product descriptions render as React text; no raw HTML is executed. SVG/HTML uploads are rejected. Local orders and decrypted message cache are not encrypted at rest; protect the browser profile. Third-party relays, RPC providers, media hosts and rate services can observe requests. Static hosting logs and blockchain records have their own privacy properties.

## Hosting and SEO

GitHub Pages serves static output under the repository path, with a `404.html` SPA fallback for dynamic URLs. Deep links may carry HTTP 404 even when the app loads. Cloudflare Pages can use `_redirects` for HTTP 200 SPA routing and `_headers` for response headers. CSP is also supplied in HTML; GitHub Pages cannot apply custom response headers. There is no per-product server rendering, dynamic sitemap or complete social-card SEO implementation in this release.
