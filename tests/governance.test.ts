import { it, expect } from "vitest";
import { finalizeEvent } from "nostr-tools";
import { parseGovernance, defaultGovernance } from "../packages/governance";
import { canonical } from "../packages/security";
import { seller, sellerKey, buyer } from "./fixtures";
import { verifyReview } from "../packages/reviews";
import issuer from "../apps/edge/index";
const event = () =>
  finalizeEvent(
    {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["d", "aislezero:governance:v1"]],
      content: canonical({
        ...defaultGovernance,
        blockedListings: ["30402:" + seller + ":test-lamp"],
      }),
    },
    sellerKey,
  );
it("accepts authoritative signed operator decisions", () =>
  expect(parseGovernance(event(), seller)?.blockedListings).toHaveLength(1));
it("rejects decisions signed by another identity", () =>
  expect(parseGovernance(event(), buyer)).toBeNull());
it("rejects a tampered governance record", () => {
  const e = JSON.parse(JSON.stringify(event()));
  e.content += " ";
  expect(parseGovernance(e, seller)).toBeNull();
});
it("rejects unsigned or unrelated review events", async () => {
  await expect(verifyReview(event())).rejects.toThrow(
    "Invalid review signature",
  );
});
it("keeps issuer inactive before operator activation", async () => {
  const r = await issuer.fetch(
    new Request("https://issuer.example/quote", {
      method: "POST",
      headers: { Origin: "https://shop.example" },
      body: "{}",
    }),
    {
      ALLOWED_ORIGIN: "https://shop.example",
      PAYMENTS_ENABLED: "false",
    } as any,
  );
  expect(r.status).toBe(503);
});
it("rejects unauthorized issuer origins", async () => {
  const r = await issuer.fetch(
    new Request("https://issuer.example/quote", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
      body: "{}",
    }),
    { ALLOWED_ORIGIN: "https://shop.example", PAYMENTS_ENABLED: "true" } as any,
  );
  expect(r.status).toBe(403);
});
