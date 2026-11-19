# Delivery status and verification

This document distinguishes implemented behavior, test evidence and outstanding work. The master specification's full commercial-launch acceptance criteria are **not all satisfied**. This release must not be described as a fully audited or production-ready global marketplace.

## Feature matrix

| Area                 | Delivered behavior                                                                                                                                                                                     | Evidence / activation boundary                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Design and routes    | Responsive original homepage, category discovery, storefronts, product detail, compare, saved products, cart, checkout, account, merchant studio, policies, help, reports, RFQ and operator governance | Desktop/mobile route and overflow checks; homepage axe WCAG AA rules and keyboard check                                       |
| Public catalog       | Real NIP-99 query, verification, signed updates, deletion requests, client index, combined filters, fuzzy/prefix search, NIP-50 querying and progressive earlier pages                                 | Local WebSocket relay tests; browser catalog/search/saved/cart journeys                                                       |
| Merchant profiles    | NIP-07 / NIP-46 signing, public store profile, locations, policies and receiving addresses                                                                                                             | Signature and schema checks; real signer/provider activation required                                                         |
| Membership discovery | Trusted annual credentials, expiry checks, active discovery eligibility                                                                                                                                | Forged, expired, altered-duration and substituted-merchant credential tests; production issuer is unconfigured                |
| Product management   | Local drafts, structured commerce forms, variants, media references, CSV import/export, duplicate, sold/pause, active/inactive signed publication and replication status                               | Schema/signature/local relay checks; full merchant browser publication matrix remains incomplete                              |
| Media                | Merchant Pinata uploads; configurable HTTPS/Arweave-funded endpoint adapters, signature/MIME/size/dimension inspection, hashes, progress, cancellation, reference order and alt text                   | Browser route checks; actual provider credentials/funding and CORS are not configured                                         |
| Wallets              | EIP-6963 discovery; EIP-1193 switching/transfers; Solana Wallet Standard; UniSat SegWit/Taproot PSBT; Nostr extension/remote signer                                                                    | Explicit compatibility constraints documented; real installed wallet signing matrix not executed                              |
| Direct checkout      | Encrypted seller-confirmed requests, exact signed intents, direct recipient display, reference-bound transfers and independent verification                                                            | Local Bitcoin/RPC rejection tests, amount/intent tests and local EVM ABI reference test; no real funds used                   |
| Private messages     | NIP-17 / NIP-44 / NIP-59 encryption, sender copies, recipient inbox discovery, decrypted local history                                                                                                 | Actual local relay encrypted round trip; browser private order request                                                        |
| Orders               | Participant state permissions, private update reconciliation, independent remote paid-status checks, fulfilment/tracking and buyer receipt                                                             | State-machine tests and browser request journey; complete settlement/fulfilment wallet E2E still required                     |
| Offers and RFQ       | Signed private offers, accept/decline/counter messages, requested-order creation, public expiring RFQ and private quotation messaging                                                                  | Schemas and live publication paths; advanced negotiation and RFQ edit/withdraw workflow remains incomplete                    |
| Reviews              | Public buyer-signed reviews with seller-signed payment request, listing and receipt binding; independent chain verification before purchase-linked display                                             | Forged/unrelated event rejection; live review verification requires real settled purchase records                             |
| Governance           | Configured operator key, signed visibility blocklists/reasons, prohibited categories, merchant-country restrictions, private reports/appeals                                                           | Signature/tamper rejection tests; operator inbox and real moderation operations unconfigured                                  |
| Subscription issuer  | Stateless signed fresh quotes, direct treasury settlement verification, identity-bound annual credentials, deterministic non-extending receipt reclaims                                                | Worker dry-run bundle; inactive/origin rejection tests; hosted endpoint, keys and treasury configuration absent               |
| Hosting              | Reproducible build, GitHub CI/artifact packaging, optional Cloudflare Pages workflow, separate issuer Worker configuration                                                                             | Temporary static Workers deployment verified with HTTP 200 on home and deep links; ownership claim required to retain hosting |

## Checks executed locally

- Strict TypeScript check: passed.
- Vitest unit/integration suite: 46 tests passed across four files at the time of this handover.
- Local EVM: two checks passed for reference-appended ABI transfer execution and zero-destination rejection using a test-only token model.
- Playwright: eight checks passed across desktop and mobile Chromium for catalog, search, product, saved/cart persistence, private purchase request, critical routes, disabled activation, keyboard skip link and homepage automated accessibility rules. These are limited journeys, not complete WCAG conformance certification.
- Production static build: passed. Vite emits a browser externalization notice for an unused `node:worker_threads` dependency branch in Viem's transitive Ox package. No failing browser runtime error was observed in the covered journeys.
- `npm audit`: zero reported vulnerabilities after updating packages and overriding the compatible patched `tmp` version. This is not an audit of application logic.
- Cloudflare Worker deploy dry-run: succeeded. The membership issuer was not deployed and no mainnet transfer was performed. The separate static application was deployed to a temporary Workers account.
- Production preview smoke check: HTTP 200, zero application page errors, zero TEST ONLY fixture text and no mobile horizontal overflow. This used the actual production bundle with default public relay configuration, separate from the fixture-based browser suite.

Later CI runs are the authoritative checks for the committed revision. Screenshots and failure traces are ignored local artifacts, not production product imagery.

## Remaining implementation work

These are engineering limitations, not missing credentials:

- Mobile WalletConnect connection is not included. NIP-42 AUTH-only inbox relay negotiation is not yet supported. Remote signer authorization UI and wallet reconnection/replacement behavior need broader compatibility tests.
- Full automated multichain settlement, rejected-wallet, token-implementation, Solana program/rent, Bitcoin fee/PSBT and subscription issuance/renewal adversarial integration suites remain incomplete. Current tests do not establish production payment safety.
- Automatic transaction replacement/drop/reorganization recovery, partial/overpayment reconciliation and refund verification are not implemented; errors require direct merchant/operator reconciliation.
- Bulk listing changes, dedicated inventory/price batch controls, full RFQ edit/withdraw UI, rich negotiation-to-payment automation, merchant review replies, independent business attestations, collection curation and purchase reputation scoring are not complete.
- Wholesale tiers and customizations are publishable structured data, but sophisticated negotiated shipping/tax/variant pricing and automated volume-tier checkout require further work. Merchants must verify exact totals before signing payment requests.
- Gallery gestures, automated media optimization/responsive derivatives, provider-specific native funded Arweave signing and advanced video validation are not complete. The generic Arweave endpoint adapter requires merchant infrastructure.
- No encrypted-at-rest local records, encrypted backup import/export or guaranteed cross-device synchronization. No complete SEO server rendering, product sitemap/social metadata, realistic large-catalog benchmark or virtualization. No complete accessibility audit across all routes.
- Branding, trusted issuer/network settings, treasury/price and legal copy are source-controlled; the public signed governance editor covers visibility policy rather than a complete runtime operator configuration system. Country-based listing filters do not establish buyer/seller regulatory eligibility. Jurisdiction-specific verification and compliance workflows are not implemented.

## Outstanding external activation requirements

1. Claim the temporary Cloudflare hosting account within its 60-minute window, or configure your own commerce host and deployment credentials. GitHub Pages prohibits e-commerce hosting. The static preview does not activate the commercial services.
2. Stateless issuer deployment, dedicated secret issuer key, published trusted public key, real subscription treasury addresses and reliable mainnet RPC configuration.
3. Merchant signer/wallet extensions, merchant-funded media provider accounts and compatible inbox relays.
4. Explicit operator authorization for real-money activation, controlled mainnet validation, independent payment-security review and jurisdiction-specific legal/compliance operations.

The architecture does not require a product database, media bucket, commission contract, escrow contract, Solana program, Bitcoin treasury private key on the issuer, or platform access to buyer purchase funds.
