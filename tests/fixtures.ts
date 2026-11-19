import { finalizeEvent, getPublicKey, type Event } from "nostr-tools";
import { hexToBytes } from "viem";
import { defaultExtension, listingTemplate } from "../packages/commerce/schema";
import { canonical } from "../packages/security";
export const issuerKey = new Uint8Array(32).fill(0x11),
  sellerKey = new Uint8Array(32).fill(0x22),
  buyerKey = new Uint8Array(32).fill(0x33);
export const issuer = getPublicKey(issuerKey),
  seller = getPublicKey(sellerKey),
  buyer = getPublicKey(buyerKey);
export function fixtureEvents(): Event[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    finalizeEvent(
      listingTemplate({
        id: "test-lamp",
        title: "TEST ONLY — Handcrafted reading lamp",
        description:
          "An isolated test fixture for signed marketplace integration tests. Not a real product.",
        category: "home-living",
        price: "79.50",
        currency: "USD",
        extension: {
          ...defaultExtension,
          brand: "Test workshop",
          quantity: 5,
          country: "India",
          shipsTo: ["India"],
          shipping: "5",
          addresses: { ethereum: "0x1111111111111111111111111111111111111111" },
          media: [],
          specifications: { material: "brass" },
          assets: ["ETH:ethereum"],
        },
      }),
      sellerKey,
    ),
    finalizeEvent(
      {
        kind: 0,
        created_at: now,
        tags: [],
        content: canonical({
          name: "TEST ONLY Workshop",
          about: "Isolated test merchant",
          country: "India",
          shipsTo: ["India"],
          policies: "Test fixture only",
          accent: "#4056f4",
          addresses: { ethereum: "0x1111111111111111111111111111111111111111" },
        }),
      },
      sellerKey,
    ),
    finalizeEvent(
      {
        kind: 30078,
        created_at: now,
        tags: [["d", `aislezero:membership:${seller}`]],
        content: canonical({
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
}
