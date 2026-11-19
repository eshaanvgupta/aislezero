import { WebSocketServer } from "ws";
import { finalizeEvent, getPublicKey, verifyEvent } from "nostr-tools";
import { spawn } from "node:child_process";
const key = (n) => Uint8Array.from({ length: 32 }, () => n),
  sellerKey = key(0x22),
  issuerKey = key(0x11),
  buyerKey = key(0x33),
  seller = getPublicKey(sellerKey),
  issuer = getPublicKey(issuerKey),
  buyer = getPublicKey(buyerKey),
  now = Math.floor(Date.now() / 1000);
const extension = {
  version: 1,
  brand: "Test workshop",
  sku: "test",
  condition: "new",
  quantity: 5,
  country: "India",
  shipsTo: ["India"],
  shipping: "5",
  tax: "0",
  dispatchDays: 3,
  delivery: "Test estimate",
  returns: "Test return policy",
  warranty: "",
  assets: ["ETH:ethereum"],
  addresses: { ethereum: "0x" + "11".repeat(20) },
  media: [],
  specifications: { material: "brass" },
  variants: [],
  wholesale: false,
  moq: 1,
  tiers: [],
  customization: "",
  collection: "",
};
const records = [
  finalizeEvent(
    {
      kind: 30402,
      created_at: now,
      content:
        "An isolated automated test fixture. This is not an actual product.",
      tags: [
        ["d", "test-lamp"],
        ["title", "TEST ONLY — Handcrafted reading lamp"],
        ["price", "79.50", "USD"],
        ["t", "home-living"],
        ["status", "active"],
        ["location", "India"],
        ["aislezero", "1", JSON.stringify(extension)],
      ],
    },
    sellerKey,
  ),
  finalizeEvent(
    {
      kind: 0,
      created_at: now,
      tags: [],
      content: JSON.stringify({
        name: "TEST ONLY Workshop",
        about: "Isolated test merchant",
        country: "India",
        shipsTo: ["India"],
        policies: "Test fixture only",
        accent: "#4056f4",
        addresses: extension.addresses,
      }),
    },
    sellerKey,
  ),
  finalizeEvent(
    {
      kind: 30078,
      created_at: now,
      tags: [["d", `aislezero:membership:${seller}`]],
      content: JSON.stringify({
        version: 1,
        merchant: seller,
        subscriptionId: "test-subscription-fixture",
        network: "ethereum",
        transaction: "0x" + "44".repeat(32),
        issuedAt: now - 1000,
        expiresAt: now - 1000 + 365 * 86400,
        issuer,
      }),
    },
    issuerKey,
  ),
  ...[seller, buyer].map((p) =>
    finalizeEvent(
      {
        kind: 10050,
        created_at: now,
        content: "",
        tags: [["relay", "ws://127.0.0.1:17292"]],
      },
      p === seller ? sellerKey : buyerKey,
    ),
  ),
];
const relay = new WebSocketServer({ port: 17292 });
relay.on("connection", (ws) =>
  ws.on("message", (raw) => {
    const [type, id, ...filters] = JSON.parse(raw.toString());
    if (type === "REQ") {
      for (const e of records)
        if (
          filters.some(
            (f) =>
              (!f.kinds || f.kinds.includes(e.kind)) &&
              (!f.authors || f.authors.includes(e.pubkey)) &&
              (!f.until || e.created_at <= f.until) &&
              Object.keys(f)
                .filter((k) => k.startsWith("#"))
                .every((k) =>
                  e.tags.some(
                    (t) => t[0] === k.slice(1) && f[k].includes(t[1]),
                  ),
                ),
          )
        )
          ws.send(JSON.stringify(["EVENT", id, e]));
      ws.send(JSON.stringify(["EOSE", id]));
    }
    if (type === "EVENT") {
      if (verifyEvent(id)) {
        records.push(id);
        ws.send(JSON.stringify(["OK", id.id, true, "stored"]));
      } else ws.send(JSON.stringify(["OK", id.id, false, "bad signature"]));
    }
  }),
);
const child = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
    "--strictPort",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_RELAYS: "ws://127.0.0.1:17292",
      VITE_SEARCH_RELAYS: "ws://127.0.0.1:17292",
      VITE_TRUSTED_ISSUERS: issuer,
      VITE_PAYMENTS_ENABLED: "false",
    },
  },
);
function stop() {
  child.kill();
  for (const client of relay.clients) client.terminate();
  relay.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", () => process.exit());
