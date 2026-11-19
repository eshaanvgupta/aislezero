# Security and privacy review

This release is not security-audited. Automated checks are evidence of specified behavior, not a guarantee against financial loss. The supplied master specification uses OWASP ASVS 5.0 as a reference; a complete ASVS assessment has not been performed.

## Trust boundaries and controls

- **Relay poisoning:** validate Nostr event signatures and computed IDs, cap content/tag counts, deduplicate, ignore future-dated results and reconcile signed updates. Relays can censor, delay or retain content; acknowledgement does not establish permanence. Listing-level expiry is refreshed periodically.
- **Membership forgery:** only configured issuer keys can grant annual entitlements. Credential merchant, `d` tag, issuer, signature, issuance time and exact 365-day duration must agree. Issuer compromise can create fraudulent memberships; public-key rotation and remediation remain operator responsibilities.
- **Receipt replay:** payment commitments hash the complete intent, including merchant/buyer identities, order UUID, purpose, asset/network, receiving address, units and quote window. A transaction bound to one intent cannot verify another. Subscription reclaims use original confirmed time and cannot extend duration or activate an unrelated identity.
- **Amounts and networks:** all blockchain quantities use bigint/Decimal, explicit allowlist decimals and upward quote rounding. EVM chain IDs and Solana genesis are checked. Exact contract/mint, recipient, amount, commitment and confirmation policy are verified independently of wallet output. Blockchain providers remain trusted observations; multi-provider consensus is not implemented.
- **Wallet requests:** connection is separate from payment authorization. No seed phrases/private keys or token approvals are requested. Provider errors reject the action. Native/SPL transfers and Bitcoin PSBTs include the intent commitment. The frontend mainnet flag defaults off. Wallet software and injected providers can misbehave and require independent user verification.
- **Private messages:** NIP-44 encryption, NIP-17/NIP-59 sealing and ephemeral wrapping; outer signature, inner seal signature and rumor/seal identity agreement are checked. Only sender/recipient order updates are reconciled. A remote claimed verified status triggers independent payment verification. Signer compromise exposes identity and messages.
- **Orders:** stock is seller-confirmed; public relay listing updates do not constitute atomic reservations. Each state transition has a buyer, seller or verifier role. Fulfilment and delivery promises are not platform guarantees. Local records can be modified by their owner; untrusted local state is not a server authorization mechanism.
- **XSS and media:** render merchant descriptions as text; validate HTTPS media URLs and reject embedded credentials/local/literal-IP hosts. Uploaded signatures, dimensions, MIME and size are checked; SVG and HTML are excluded. File contents never pass through AisleZero. Public hostnames may still resolve unexpectedly; browser network policy is the final boundary.
- **Operator abuse:** trusted signed governance records determine local visibility. Reports and appeals use encrypted messages. Hiding content does not delete independent relay copies. Configuration deployment and operator key management remain trusted administrative actions.
- **Issuer exposure:** exact-origin CORS, input/body limits, fresh merchant signature checks, explicit mainnet configuration, rate limiting and secret-only issuer signing key. CORS is not authentication. Request bodies are streamed with a 20 KB hard limit before JSON parsing.

## Material remaining risks

No real-money transactions were executed during development. Mainnet token implementations must be tested for acceptance of trailing intent bytes after ERC20 transfer arguments. The test EVM token verifies the ABI pattern, not production token implementation behavior. Solana Wallet Standard, SPL and Bitcoin PSBT paths require additional wallet/testnet matrix coverage before live activation. Chain reorg/replacement handling is manual and refresh-based. Underpayments, overpayments or expired quotes are rejected and need merchant reconciliation; automatic refunds and recovery are not implemented.

LocalStorage and IndexedDB records, including decrypted message history, are not encrypted at rest. No cross-device completeness guarantee exists. Malicious extensions or browser-profile access can compromise data. No telemetry collection is included, but third-party RPC, relay, hosting and media services can observe requests.

The static HTML CSP allows arbitrary HTTPS media and WSS services to support user-controlled infrastructure. GitHub repository artifacts are not an application hosting boundary. For production Cloudflare hosting, apply response headers and narrow provider origins where feasible. Third-party URLs must be reviewed before trusting sensitive operations. Pin dependency versions and retain the lockfile. Run `npm audit` and secret scanning on release changes; zero currently reported advisories does not establish absence of vulnerabilities.

## Disclosure

Report a suspected vulnerability privately to the repository owner using an available private GitHub reporting channel. Do not publish private keys, personal messages, shipping addresses or exploitable production data in public issues. A dedicated security-contact address and response process must be established by the operator before launch.
