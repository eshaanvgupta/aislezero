# AisleZero

**Real products. Direct payments. Zero commission.**

A merchant-controlled marketplace built with React, strict TypeScript and Nostr. Listings are seller-signed, media stays with merchant providers, messages are participant-encrypted and purchase transfers go directly to merchant wallets. Annual merchant membership is $125 USD equivalent, with no platform sales commissions.

**Release status:** source and static application are ready for repository publication and hosting configuration. This is **not a commercially launch-ready implementation of every item in the supplied master specification**. Live payments are disabled. The [verified feature matrix and remaining implementation work](docs/STATUS.md) identify the actual boundaries. Do not enable real-money use until the documented technical, security and operator launch gates are completed.

```sh
npm ci
npm run dev
npm run check
npx playwright install chromium
npm run test:e2e
```

Use Node 24. On Windows PowerShell, use `npm.cmd` / `npx.cmd` if npm.ps1 is blocked. The build output is `dist/`.

The application contains no sample products in production. An empty eligible merchant catalog is expected until operator trust is configured and merchants publish paid, signed listings. Test fixtures exist only in isolated local test services.

| Documentation                           | Contents                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)    | Data ownership, module boundaries, identities, orders, payments, issuer and privacy       |
| [Protocol and tokens](docs/PROTOCOL.md) | Nostr schemas, wallet compatibility, explicit asset allowlist and sources                 |
| [Operator handover](docs/OPERATIONS.md) | Installation, environment variables, hosting, issuer configuration, costs and recovery    |
| [Security model](docs/SECURITY.md)      | Threat boundaries, payment checks, operational risks and review requirements              |
| [Delivery status](docs/STATUS.md)       | Feature checklist, executed validation, remaining engineering and activation requirements |

GitHub hosts the source, CI and build artifacts. **GitHub Pages is not the commerce host:** its [usage limits prohibit e-commerce hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). The included workflow optionally deploys verified static artifacts to Cloudflare Pages after the account/project and deployment credentials are configured. The stateless membership Worker is deployed separately.

Code is MIT licensed. Font assets retain their upstream OFL notices. This project has not undergone an independent security audit or jurisdiction-specific legal review.
