import { beforeAll, afterAll, it, expect } from "vitest";
import { createServer, type Server } from "node:http";
import {
  verifyPayment,
  intentHash,
  type PaymentIntent,
} from "../packages/payments";
import { buyer, seller } from "./fixtures";
let server: Server;
let mode = "valid";
const txid = "ab".repeat(32);
let commitment = "";
const now = Math.floor(Date.now() / 1000);
const intent: PaymentIntent = {
  version: 1,
  orderId: crypto.randomUUID(),
  listing: "30402:" + seller + ":test-lamp",
  buyer,
  seller,
  asset: "BTC:bitcoin",
  recipient: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  units: "12345",
  createdAt: now - 60,
  expiresAt: now + 900,
  usd: "1",
  rate: "1",
  source: "test",
  purpose: "purchase",
};
const endpoints = {
  bitcoin: "http://127.0.0.1:17293",
  ethereum: "http://127.0.0.1:17293",
  bnb: "http://127.0.0.1:17293",
  solana: "http://127.0.0.1:17293",
};
beforeAll(async () => {
  commitment = await intentHash(intent);
  server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/blocks/tip/height") {
      res.end("106");
      return;
    }
    if (req.url?.startsWith("/tx/")) {
      res.end(
        JSON.stringify({
          status: {
            confirmed: true,
            block_height: mode === "pending" ? 105 : 100,
            block_time: mode === "late" ? intent.expiresAt + 1 : now,
          },
          vout: [
            {
              scriptpubkey_address:
                mode === "recipient" ? "wrong" : intent.recipient,
              value: mode === "amount" ? 12344 : 12345,
            },
            {
              scriptpubkey:
                "6a20" + (mode === "intent" ? "00".repeat(32) : commitment),
              value: 0,
            },
          ],
        }),
      );
      return;
    }
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw);
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: body.method === "eth_chainId" ? "0x38" : "wrong-genesis",
        }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(17293, "127.0.0.1", r));
});
afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});
it("independently verifies confirmed Bitcoin amount, recipient, timing and commitment", async () => {
  mode = "valid";
  expect((await verifyPayment(intent, txid, endpoints)).intent).toBe(
    commitment,
  );
});
it.each(["amount", "recipient", "intent", "pending", "late"])(
  "rejects incorrect Bitcoin %s",
  async (name) => {
    mode = name;
    await expect(verifyPayment(intent, txid, endpoints)).rejects.toThrow();
  },
);
it("rejects a mismatched EVM chain before interpreting a receipt", async () => {
  await expect(
    verifyPayment(
      { ...intent, asset: "ETH:ethereum", recipient: "0x" + "11".repeat(20) },
      "0x" + txid,
      endpoints,
    ),
  ).rejects.toThrow("wrong blockchain");
});
it("rejects a mismatched Solana genesis before interpreting a receipt", async () => {
  const signature = "1".repeat(64);
  await expect(
    verifyPayment(
      {
        ...intent,
        asset: "SOL:solana",
        recipient: "11111111111111111111111111111111",
      },
      signature,
      endpoints,
    ),
  ).rejects.toThrow("not Solana mainnet");
});
