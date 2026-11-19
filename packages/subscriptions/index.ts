import { verifyEvent, getEventHash, type Event } from "nostr-tools";
import { z } from "zod";
import { pubkeySchema } from "../security";
import {
  paymentIntentSchema,
  quoteUnits,
  validateAddress,
  type PaymentIntent,
} from "../payments";
import { getAsset } from "../payments/assets";
export const membershipSchema = z.object({
  version: z.literal(1),
  merchant: pubkeySchema,
  subscriptionId: z.string().min(16),
  network: z.enum(["ethereum", "bnb", "solana", "bitcoin"]),
  transaction: z.string().min(20),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
  issuer: pubkeySchema,
});
export type Membership = z.infer<typeof membershipSchema>;
export function verifyIssuerQuote(
  event: Event,
  issuers: string[],
  merchant: string,
  assetId: string,
  now = Math.floor(Date.now() / 1000),
): PaymentIntent {
  if (
    !verifyEvent(event) ||
    event.id !== getEventHash(event) ||
    !issuers.includes(event.pubkey) ||
    event.kind !== 30078
  )
    throw new Error("Invalid or untrusted subscription quote");
  const v = paymentIntentSchema.parse(JSON.parse(event.content)),
    asset = getAsset(v.asset);
  validateAddress(v.recipient, asset);
  if (
    v.buyer !== merchant ||
    v.seller !== event.pubkey ||
    v.asset !== assetId ||
    v.purpose !== "subscription" ||
    v.usd !== "125" ||
    v.listing !== "membership" ||
    v.source !== "CoinGecko" ||
    event.tags.find((t) => t[0] === "d")?.[1] !==
      `aislezero:subscription-quote:${v.orderId}` ||
    event.created_at !== v.createdAt ||
    v.createdAt > now + 30 ||
    v.expiresAt <= now ||
    v.expiresAt - v.createdAt > (asset.network === "bitcoin" ? 7200 : 900) ||
    quoteUnits("125", v.rate, asset.decimals) !== BigInt(v.units)
  )
    throw new Error(
      "Subscription quote identity, asset, amount or validity does not match",
    );
  return v;
}
export function verifyMembership(
  event: Event,
  issuers: string[],
  now = Math.floor(Date.now() / 1000),
): Membership | null {
  try {
    if (
      event.kind !== 30078 ||
      !issuers.includes(event.pubkey) ||
      !verifyEvent(event) ||
      event.id !== getEventHash(event)
    )
      return null;
    const v = membershipSchema.parse(JSON.parse(event.content));
    if (
      v.issuer !== event.pubkey ||
      event.tags.find((t) => t[0] === "d")?.[1] !==
        `aislezero:membership:${v.merchant}` ||
      v.expiresAt - v.issuedAt !== 365 * 86400 ||
      v.issuedAt > now ||
      v.expiresAt <= now ||
      event.created_at < v.issuedAt
    )
      return null;
    return v;
  } catch {
    return null;
  }
}
