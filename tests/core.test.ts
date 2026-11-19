import { describe, it, expect } from "vitest";
import { finalizeEvent, verifyEvent } from "nostr-tools";
import {
  issuer,
  issuerKey,
  seller,
  sellerKey,
  buyer,
  fixtureEvents,
} from "./fixtures";
import { verifyMembership } from "../packages/subscriptions";
import { canonical, safeUrl, relayUrl } from "../packages/security";
import {
  toUnits,
  quoteUnits,
  validateIntent,
  intentHash,
  validateAddress,
  type PaymentIntent,
} from "../packages/payments";
import { getAsset } from "../packages/payments/assets";
import {
  canTransition,
  listingTemplate,
  parseListing,
  defaultExtension,
  listingInputSchema,
} from "../packages/commerce/schema";
import { searchListings, emptyFilters } from "../packages/search";
import { parseCsv, exportCsv } from "../packages/local";
import { latest } from "../packages/nostr";
const now = Math.floor(Date.now() / 1000);
const intent: PaymentIntent = {
  version: 1,
  orderId: "c1532254-4e15-4d96-a267-a665f75a0001",
  listing: "30402:" + seller + ":test-lamp",
  buyer,
  seller,
  asset: "USDC:ethereum",
  recipient: "0x1111111111111111111111111111111111111111",
  units: "125000000",
  createdAt: now,
  expiresAt: now + 900,
  usd: "125",
  rate: "1",
  source: "test",
  purpose: "purchase",
};
const signed = () =>
  finalizeEvent(
    {
      kind: 30078,
      created_at: now,
      tags: [["d", `aislezero:payment:${intent.orderId}`]],
      content: canonical(intent),
    },
    sellerKey,
  );
describe("exact payment amounts", () => {
  it("preserves satoshis and large token amounts", () => {
    expect(toUnits("0.00000001", 8)).toBe(1n);
    expect(toUnits("123456789012.123456", 6)).toBe(123456789012123456n);
  });
  it("rounds the quote upward by no more than one base unit", () =>
    expect(quoteUnits("125", "3", 6)).toBe(41666667n));
  it("rejects floating-point syntax and excess precision", () => {
    expect(() => toUnits("1e8", 8)).toThrow();
    expect(() => toUnits("-1", 8)).toThrow();
    expect(() => toUnits("0.000000001", 8)).toThrow();
  });
  it("rejects zero conversion rates", () =>
    expect(() => quoteUnits("125", "0", 6)).toThrow());
  it("does not allow unlisted stablecoin networks", () =>
    expect(() => getAsset("USDC:bnb")).toThrow());
  it("rejects a zero recipient", () =>
    expect(() =>
      validateAddress("0x" + "0".repeat(40), getAsset("ETH:ethereum")),
    ).toThrow());
});
describe("seller-signed order commitments", () => {
  it("accepts a current request bound to the exact participants and order", () =>
    expect(
      validateIntent(signed(), { seller, buyer, orderId: intent.orderId })
        .units,
    ).toBe("125000000"));
  it("rejects forged recipients", () => {
    const e = JSON.parse(JSON.stringify(signed()));
    e.content = e.content.replace("125000000", "1");
    expect(() =>
      validateIntent(e, { seller, buyer, orderId: intent.orderId }),
    ).toThrow();
  });
  it("rejects another buyer or order", () => {
    expect(() =>
      validateIntent(signed(), {
        seller,
        buyer: issuer,
        orderId: intent.orderId,
      }),
    ).toThrow();
    expect(() =>
      validateIntent(signed(), { seller, buyer, orderId: crypto.randomUUID() }),
    ).toThrow();
  });
  it("rejects expired quotes", () =>
    expect(() =>
      validateIntent(
        signed(),
        { seller, buyer, orderId: intent.orderId },
        now + 901,
      ),
    ).toThrow());
  it("commits to network, recipient and order separately", async () => {
    const original = await intentHash(intent);
    for (const change of [
      { asset: "USDT:ethereum" },
      { recipient: "0x2222222222222222222222222222222222222222" },
      { orderId: crypto.randomUUID() },
    ])
      expect(await intentHash({ ...intent, ...change })).not.toBe(original);
  });
});
describe("membership credentials", () => {
  const event = fixtureEvents()[2];
  it("accepts a trusted, identity-bound annual entitlement", () =>
    expect(verifyMembership(event, [issuer])?.merchant).toBe(seller));
  it("rejects unknown issuers", () =>
    expect(verifyMembership(event, [buyer])).toBeNull());
  it("rejects expired credentials", () =>
    expect(verifyMembership(event, [issuer], now + 366 * 86400)).toBeNull());
  it("rejects tampering and changed duration", () => {
    const e = JSON.parse(JSON.stringify(event));
    e.content = e.content.replace(seller, buyer);
    expect(verifyMembership(e, [issuer])).toBeNull();
    const v = JSON.parse(event.content);
    v.expiresAt++;
    const changed = finalizeEvent(
      { ...event, content: canonical(v) },
      issuerKey,
    );
    expect(verifyMembership(changed, [issuer])).toBeNull();
  });
  it("rejects merchant substitution even with a new signature", () => {
    const v = JSON.parse(event.content);
    v.merchant = buyer;
    const changed = finalizeEvent(
      { ...event, content: canonical(v) },
      issuerKey,
    );
    expect(verifyMembership(changed, [issuer])).toBeNull();
  });
});
describe("merchant data, discovery and orders", () => {
  const listing = parseListing(fixtureEvents()[0])!;
  it("round trips NIP-99 descriptions and extensions", () => {
    expect(listing.title).toContain("TEST ONLY");
    expect(listing.extension.specifications.material).toBe("brass");
  });
  it("supports combined fuzzy keyword, country, category and price filters", () => {
    expect(
      searchListings([listing], {
        ...emptyFilters,
        query: "handcraft",
        country: "india",
        category: "home-living",
        max: "80",
      }),
    ).toHaveLength(1);
    expect(
      searchListings([listing], { ...emptyFilters, max: "70" }),
    ).toHaveLength(0);
  });
  it("accepts only authorized lifecycle transitions", () => {
    expect(canTransition("requested", "accepted", "seller")).toBe(true);
    expect(canTransition("requested", "verified", "buyer")).toBe(false);
    expect(canTransition("submitted", "verified", "seller")).toBe(false);
    expect(canTransition("submitted", "verified", "verifier")).toBe(true);
    expect(canTransition("shipped", "received", "buyer")).toBe(true);
  });
  it("selects latest addressable event with deterministic ID tie breaking", () => {
    const old = fixtureEvents()[0];
    const updated = finalizeEvent(
      {
        ...old,
        created_at: old.created_at + 1,
        content: "Updated test description",
      },
      sellerKey,
    );
    expect(latest([old, updated])[0].content).toBe("Updated test description");
  });
  it("rejects malicious media URLs in listing extensions", () =>
    expect(() =>
      listingInputSchema.parse({
        ...listing,
        extension: {
          ...listing.extension,
          media: [{ url: "javascript:alert(1)", alt: "bad", type: "image" }],
        },
      }),
    ).toThrow());
  it("preserves quoted CSV cells and prevents spreadsheet formula injection", () => {
    const csv = exportCsv([{ title: 'Hello, "world"', price: "=1+1" }]);
    const rows = parseCsv(csv);
    expect(rows[0].title).toBe('Hello, "world"');
    expect(rows[0].price).toBe("'=1+1");
  });
  it("canonicalizes signed extension keys", () =>
    expect(canonical({ z: 2, a: { b: 1, a: 0 } })).toBe(
      '{"a":{"a":0,"b":1},"z":2}',
    ));
});
describe("untrusted URLs", () => {
  it.each([
    "javascript:alert(1)",
    "http://example.com/a.jpg",
    "https://127.0.0.1/",
    "https://localhost/a",
    "https://user:pass@example.com/a",
  ])("blocks %s", (url) => expect(() => safeUrl(url)).toThrow());
  it("allows public HTTPS assets and secure relays", () => {
    expect(safeUrl("https://example.com/a.jpg")).toBe(
      "https://example.com/a.jpg",
    );
    expect(relayUrl("wss://relay.example/")).toBe("wss://relay.example");
  });
});
