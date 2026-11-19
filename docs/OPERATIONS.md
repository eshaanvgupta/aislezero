# Installation, deployment and operator handover

## Local development

Use Node.js 24 and npm. On Windows PowerShell, use `npm.cmd` and `npx.cmd` if script execution policy blocks npm.ps1.

```sh
npm ci
cp .env.example .env
npm run dev
npm run check
npx playwright install chromium
npm run test:e2e
```

The unit suite starts isolated local WebSocket and HTTP services on ports 17292 and 17293. Browser tests start a test-only relay and Vite on 17292 and 4173. Fixtures are signed but intentionally named TEST ONLY, confined to `tests/` and `scripts/e2e-server.mjs`, and are never seeded into production relays or included in the production bundle. Do not run browser tests alongside another service using these ports.

## Frontend configuration

`VITE_RELAYS` and `VITE_SEARCH_RELAYS` are comma-separated public relay URLs. `VITE_TRUSTED_ISSUERS` is a comma-separated set of 64-character Nostr issuer public keys. `VITE_OPERATOR_PUBKEY` selects the reporting identity. `VITE_ISSUER_URL` is the independently deployed stateless issuer origin. `VITE_PAYMENTS_ENABLED` must remain `false` until explicitly authorized for mainnet. `VITE_ETH_RPC`, `VITE_BNB_RPC`, `VITE_SOL_RPC`, and `VITE_BTC_API` configure public browser-safe chain access. No secret is permitted in VITE variables.

The annual price is $125 in the current protocol. Changing it requires a reviewed source change to frontend configuration and issuer quote logic. Branding and policy content are source-controlled. Treasury keys and issuer secret never belong in the repository.

## GitHub source, CI and build artifacts

The workflow `.github/workflows/deploy.yml` installs from lockfile, type-checks, runs unit/local-relay/local-EVM tests, audits dependencies, runs desktop/mobile browser tests, and uploads the verified `aislezero-static-build` artifact. It does not host the commerce application on GitHub Pages: [GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) prohibit e-commerce hosting.

Build manually with `npm run build`. The resulting `dist` is the static artifact. For a host serving under a subpath, set BASE_PATH to that path before building. The included `404.html` is a generic SPA fallback for hosts that need it; it is not authorization to use a provider whose terms exclude the use case.

## Cloudflare Pages deployment from GitHub

Build command `npm run build`; output directory `dist`; Node 24. Set the same public environment variables. `_redirects` handles SPA routing; `_headers` adds browser headers. The CSP is embedded in index.html. Restrict `connect-src`, `img-src`, and `media-src` to approved hosts if deployment requirements permit; the default allows merchant-controlled HTTPS and independently configurable WSS services.

For the included automated deployment job, create a Cloudflare Pages project, set repository variable `CLOUDFLARE_PAGES_PROJECT` to its exact project name, and configure GitHub production-environment or repository secrets `CLOUDFLARE_API_TOKEN` (scoped for Pages deployment) and `CLOUDFLARE_ACCOUNT_ID`. Push to main or manually run the workflow. Until that variable and those credentials are configured, CI packages the build and the hosting job is skipped. The membership issuer still requires its own deployment and activation.

### Cloudflare Workers Static Assets alternative

`wrangler.site.jsonc` serves the same application as a static SPA without application storage. Run `npm run site:prepare` to build and copy the Workers asset bundle into `artifacts/workerassets`, omitting Pages-specific redirect files; then deploy with `npx wrangler deploy --config wrangler.site.jsonc`. The single command `npm run site:deploy` prepares and deploys with authenticated credentials.

Without authenticated credentials, run preparation, then `npx wrangler deploy --config wrangler.site.jsonc --temporary` to create a temporary live deployment. It returns the site URL and an ownership claim URL. The intended owner must finish the claim within 60 minutes to keep the deployment. Claim URLs are private ownership links: never commit them or publish them in repository documentation. See [Cloudflare claim deployments](https://developers.cloudflare.com/workers/platform/claim-deployments/). Subsequent deployments after claiming require your normal authenticated Cloudflare account flow. To enable GitHub CI deployment to the claimed Worker, set repository variable `CLOUDFLARE_WORKER_DEPLOY=true` and the account/token secrets above; leave CLOUDFLARE_PAGES_PROJECT unset. The static deployment does not activate payment or membership issuer services.

## Stateless membership issuer

1. Set up a Cloudflare account and authenticate `npx wrangler login`.
2. Review `apps/edge/wrangler.jsonc`. Set ALLOWED_ORIGIN to the exact frontend origin (origin only, no path). Set TREASURIES to JSON containing real mainnet receiving addresses keyed `ethereum`, `bnb`, `solana`, `bitcoin`.
3. Use independent, dependable mainnet RPC endpoints. Browser-facing endpoints must be public or use an appropriate non-secret authenticated proxy.
4. Generate a dedicated Nostr signing identity in a secure operator environment. Set the secret via `npx wrangler secret put ISSUER_SECRET --config apps/edge/wrangler.jsonc`. Do not use a treasury spend key as an issuer key.
5. Publish/enable the operator's kind 10050 inbox using the app so encrypted reports can be delivered.
6. Review the native Cloudflare rate-limit binding and infrastructure logs. Keep request-body logging disabled. The issuer persists no application records.
7. Deploy with PAYMENTS_ENABLED=false, run `npm run edge:deploy`, and verify `/health`. Configure VITE_ISSUER_URL, VITE_TRUSTED_ISSUERS and VITE_OPERATOR_PUBKEY in repository variables; rebuild.
8. Complete every launch gate below. Only after explicit operator authorization set Worker PAYMENTS_ENABLED=true and frontend VITE_PAYMENTS_ENABLED=true, then redeploy both.

The issuer needs no database, smart contract, Solana program, Bitcoin private key, xpub, or media credentials. Subscription commitments include identity in signed quote content. Reissuing a receipt cannot change its merchant or extend its validity. Actual mainnet verification has not been exercised with real funds by the build process.

## Launch gates

- Resolve all implementation gaps in `docs/STATUS.md` that affect the intended launch scope.
- Qualified legal review: operator identity/address, consumer disclosures, tax treatment, sanctions, prohibited goods, regional eligibility, privacy terms, subscription refunds and independent merchant obligations.
- Configure and test regional restrictions and mandatory compliance processes. Baseline legal pages alone are insufficient for commercial launch.
- Independent payment/cryptography review; verify addresses with a second operator-controlled channel. No security audit is claimed.
- Exercise every intended wallet and token on controlled test infrastructure, then operator-authorized small mainnet transfers. Token ABI trailing-commitment behavior must be tested on each exact production implementation.
- Verify recipient amounts, unit rounding, wrong-chain rejection, quote expiry, delayed confirmation reconciliation, membership replay/expiry, issuer key rotation and reporting delivery.
- Set up independent pinning/media persistence and test provider CORS, funding, deletion and outage handling.
- Establish merchant support, moderation and appeal operations; do not collect subscriptions without functioning support and disclosures.

## Monitoring and rollback

Monitor static availability, issuer `/health`, relay acknowledgements and RPC latency without collecting message bodies, customer addresses or private commerce content. Availability does not prove correct settlement. Rotate issuer keys by adding the new public key and retaining old public keys until their entitlements expire. Revoke compromised issuers only with a documented merchant remediation plan.

Rollback frontend by reverting the relevant Git commit and allowing the configured Cloudflare deployment job to redeploy. Disable mainnet first when settlement integrity is uncertain. Rollback Worker with Cloudflare deployment history; preserve treasury and issuer configuration. Do not rotate treasury addresses while previously signed quotes remain live. Local browser exports help recover records; relays have independent retention guarantees. Subscription claims remain recoverable from the signed quote and transaction while the issuer key remains trusted.

## Costs and troubleshooting

Static GitHub Pages hosting is subject to GitHub's current terms and limits. Cloudflare Worker usage, reliable RPC access, independent search indexing, storage/pinning and legal/security operations may incur costs. No third-party service is represented as permanently free.

Empty marketplace: configure trusted issuers and publish eligible merchant listings; no synthetic stock is inserted. Failed publication: check relay health and retry the preserved local draft. Missing images: ask the merchant to repair independent hosting. NIP-17 delivery failure: both users need kind 10050 inboxes, NIP-44 signer support and a compatible relay; AUTH-only relay negotiation remains a known gap. Quote failure: verify CoinGecko freshness, issuer origin, treasury addresses and network RPC. Delayed settlement: preserve the signed quote and transaction and reconcile directly; do not pay again automatically. Corrupt local data: export what remains, inspect browser storage and restore a validated backup; never delete a user's browser profile automatically.
