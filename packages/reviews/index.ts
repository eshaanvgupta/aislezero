import { z } from "zod";
import { getEventHash, verifyEvent, type Event } from "nostr-tools";
import { validateIntent, verifyPayment } from "../payments";
import { pubkeySchema } from "../security";
export const reviewSchema = z.object({
  version: z.literal(1),
  seller: pubkeySchema,
  listing: z.string().max(300),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(4000),
  transaction: z.string().min(20).max(200),
  paymentRequest: z.unknown(),
});
export async function verifyReview(event: Event) {
  if (
    event.kind !== 31555 ||
    !verifyEvent(event) ||
    event.id !== getEventHash(event)
  )
    throw new Error("Invalid review signature");
  const v = reviewSchema.parse(JSON.parse(event.content));
  const request = v.paymentRequest as Event;
  const body = JSON.parse(request.content);
  const intent = validateIntent(
    request,
    {
      seller: v.seller,
      buyer: event.pubkey,
      orderId: body.orderId,
      listing: v.listing,
    },
    request.created_at,
  );
  if (
    event.tags.find((t) => t[0] === "d")?.[1] !==
      `${intent.asset}:${v.transaction}` ||
    !event.tags.some((t) => t[0] === "p" && t[1] === v.seller) ||
    !event.tags.some((t) => t[0] === "a" && t[1] === v.listing)
  )
    throw new Error(
      "Review is not bound to its seller, listing and payment receipt",
    );
  await verifyPayment(intent, v.transaction);
  return { ...v, buyer: event.pubkey, createdAt: event.created_at };
}
