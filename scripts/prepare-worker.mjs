import { cp, mkdir } from "node:fs/promises";
import { basename } from "node:path";
// Pages uses _redirects; Workers Static Assets uses its explicit SPA routing setting.
// Keep provider-specific routing files out of the Workers asset bundle.
await mkdir("artifacts/workerassets", { recursive: true });
await cp("dist", "artifacts/workerassets", {
  recursive: true,
  filter: (source) =>
    !["_redirects", ".assetsignore"].includes(basename(source)),
});
