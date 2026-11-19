import { beforeAll, afterAll, it, expect } from "vitest";
import { WebSocketServer } from "ws";
import { finalizeEvent, verifyEvent, nip44, getPublicKey } from "nostr-tools";
import { pool, query, publish, connectIdentity } from "../packages/nostr";
import { sendMessage, unwrapMessage } from "../packages/messaging";
import { fixtureEvents, sellerKey, buyerKey, seller, buyer } from "./fixtures";
import { config } from "../packages/config";
const records = fixtureEvents();
let server: WebSocketServer;
const url = "ws://127.0.0.1:17292";
beforeAll(async () => {
  server = new WebSocketServer({ port: 17292 });
  await new Promise<void>((r) => server.on("listening", r));
  server.on("connection", (ws) =>
    ws.on("message", (raw) => {
      const [type, id, ...filters] = JSON.parse(raw.toString());
      if (type === "REQ") {
        for (const e of records) {
          if (
            filters.some(
              (f: any) =>
                (!f.kinds || f.kinds.includes(e.kind)) &&
                (!f.authors || f.authors.includes(e.pubkey)) &&
                (!f["#p"] ||
                  e.tags.some((t) => t[0] === "p" && f["#p"].includes(t[1]))),
            )
          )
            ws.send(JSON.stringify(["EVENT", id, e]));
        }
        ws.send(JSON.stringify(["EOSE", id]));
      }
      if (type === "EVENT") {
        const e = id;
        if (verifyEvent(e)) {
          records.push(e);
          ws.send(JSON.stringify(["OK", e.id, true, "stored"]));
        } else ws.send(JSON.stringify(["OK", e.id, false, "invalid"]));
      }
    }),
  );
  config.relays = [url];
});
afterAll(async () => {
  pool.close([url]);
  for (const ws of server.clients) ws.terminate();
  await new Promise<void>((r) => server.close(() => r()));
});
it("queries real local relay sockets and verifies every event", async () => {
  const events = await query([{ kinds: [30402], limit: 10 }], [url]);
  expect(events).toHaveLength(1);
  expect(verifyEvent(events[0])).toBe(true);
});
it("reports acknowledged publication and rejects invalid signatures", async () => {
  const e = finalizeEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: "TEST ONLY publication",
    },
    sellerKey,
  );
  expect((await publish(e, [url]))[0].ok).toBe(true);
  const forged = JSON.parse(JSON.stringify(e));
  forged.content = "forged";
  await expect(publish(forged, [url])).rejects.toThrow();
});
it("sends real NIP-17 gift wraps and rejects an impersonated inner rumor", async () => {
  const signer = (key: Uint8Array) => ({
    getPublicKey: async () => getPublicKey(key),
    signEvent: async (e: any) => finalizeEvent(e, key),
    nip44: {
      encrypt: async (p: string, t: string) =>
        nip44.v2.encrypt(t, nip44.v2.utils.getConversationKey(key, p)),
      decrypt: async (p: string, t: string) =>
        nip44.v2.decrypt(t, nip44.v2.utils.getConversationKey(key, p)),
    },
  });
  (globalThis as any).window = { nostr: signer(sellerKey) };
  await connectIdentity();
  await sendMessage(buyer, "Test-only private order question");
  const wraps = records.filter((e) => e.kind === 1059);
  expect(wraps).toHaveLength(2);
  expect(JSON.stringify(wraps)).not.toContain("private order question");
  (globalThis as any).window = { nostr: signer(buyerKey) };
  await connectIdentity();
  const incoming = wraps.find((e) =>
    e.tags.some((t) => t[0] === "p" && t[1] === buyer),
  )!;
  expect((await unwrapMessage(incoming))?.content).toBe(
    "Test-only private order question",
  );
  const bad = JSON.parse(JSON.stringify(incoming));
  bad.content += "a";
  expect(await unwrapMessage(bad)).toBeNull();
});
