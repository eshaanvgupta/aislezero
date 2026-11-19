import {
  finalizeEvent,
  getPublicKey,
  verifyEvent,
  getEventHash,
  type Event,
} from "nostr-tools";
import { hexToBytes } from "viem";
import { z } from "zod";
import { getAsset } from "../../packages/payments/assets";
import {
  freshRate,
  quoteUnits,
  verifyPayment,
  validateAddress,
  paymentIntentSchema,
  type PaymentIntent,
} from "../../packages/payments";
import { canonical, pubkeySchema } from "../../packages/security";
interface Env {
  ISSUER_SECRET: string;
  ALLOWED_ORIGIN: string;
  PAYMENTS_ENABLED: string;
  TREASURIES: string;
  ETH_RPC: string;
  BNB_RPC: string;
  SOL_RPC: string;
  BTC_API: string;
  RATE_LIMITER?: {
    limit(opts: { key: string }): Promise<{ success: boolean }>;
  };
}
const claimSchema = z.object({
  quote: z.unknown(),
  transaction: z.string().min(20).max(200),
});
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = {
      "Access-Control-Allow-Origin":
        env.ALLOWED_ORIGIN || "https://invalid.example",
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === "/health")
      return json({
        service: "AisleZero stateless membership issuer",
        active: env.PAYMENTS_ENABLED === "true",
        version: 1,
      });
    if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN)
      return json({ error: "Origin is not allowed" }, 403);
    if (env.PAYMENTS_ENABLED !== "true")
      return json({ error: "Subscription payments are not activated" }, 503);
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    if (
      env.RATE_LIMITER &&
      !(
        await env.RATE_LIMITER.limit({
          key: request.headers.get("CF-Connecting-IP") || "unknown",
        })
      ).success
    )
      return json({ error: "Too many requests" }, 429);
    try {
      if (!/^[a-f0-9]{64}$/.test(env.ISSUER_SECRET || ""))
        throw new Error("Issuer secret is not configured");
      const reader = request.body?.getReader();
      if (!reader) throw new Error("A JSON body is required");
      let size = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 20000) {
          await reader.cancel();
          return json({ error: "Request too large" }, 413);
        }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const body = JSON.parse(new TextDecoder().decode(bytes));
      const key = hexToBytes(`0x${env.ISSUER_SECRET}`),
        issuer = getPublicKey(key),
        now = Math.floor(Date.now() / 1000);
      if (url.pathname === "/quote") {
        const auth = body.auth as Event;
        if (
          !auth ||
          !verifyEvent(auth) ||
          auth.id !== getEventHash(auth) ||
          auth.kind !== 27235 ||
          Math.abs(auth.created_at - now) > 60 ||
          !auth.tags.some(
            (t) => t[0] === "u" && t[1] === url.origin + "/quote",
          ) ||
          !auth.tags.some((t) => t[0] === "method" && t[1] === "POST")
        )
          throw new Error("A fresh signed quote authorization is required");
        const payload = z
          .object({ merchant: pubkeySchema, asset: z.string() })
          .parse(JSON.parse(auth.content));
        if (auth.pubkey !== payload.merchant)
          throw new Error("Merchant identity binding is invalid");
        const asset = getAsset(payload.asset);
        const treasuries = z
          .record(z.string(), z.string())
          .parse(JSON.parse(env.TREASURIES));
        const recipient = treasuries[asset.network];
        validateAddress(recipient || "", asset);
        const rate = await freshRate(asset);
        const intent: PaymentIntent = {
          version: 1,
          orderId: crypto.randomUUID(),
          listing: "membership",
          buyer: payload.merchant,
          seller: issuer,
          asset: asset.id,
          recipient,
          units: quoteUnits("125", rate.rate, asset.decimals).toString(),
          createdAt: now,
          expiresAt: now + (asset.network === "bitcoin" ? 7200 : 900),
          usd: "125",
          source: rate.source,
          rate: rate.rate,
          purpose: "subscription",
        };
        return json({
          quote: finalizeEvent(
            {
              kind: 30078,
              created_at: now,
              tags: [["d", "aislezero:subscription-quote:" + intent.orderId]],
              content: canonical(intent),
            },
            key,
          ),
        });
      }
      if (url.pathname === "/claim") {
        const { quote: q, transaction } = claimSchema.parse(body);
        const quote = q as Event;
        if (
          !quote ||
          !verifyEvent(quote) ||
          quote.id !== getEventHash(quote) ||
          quote.pubkey !== issuer ||
          quote.kind !== 30078
        )
          throw new Error("Invalid issuer quote signature");
        const intent = paymentIntentSchema.parse(JSON.parse(quote.content));
        if (
          intent.purpose !== "subscription" ||
          intent.seller !== issuer ||
          intent.usd !== "125" ||
          quote.tags.find((t) => t[0] === "d")?.[1] !==
            `aislezero:subscription-quote:${intent.orderId}` ||
          intent.expiresAt - intent.createdAt >
            (getAsset(intent.asset).network === "bitcoin" ? 7200 : 900)
        )
          throw new Error("Invalid subscription quote binding");
        const verified = await verifyPayment(intent, transaction, {
          ethereum: env.ETH_RPC,
          bnb: env.BNB_RPC,
          solana: env.SOL_RPC,
          bitcoin: env.BTC_API,
        });
        // Issuance is deterministic from confirmed block time. Re-claiming cannot extend validity or change identity.
        const credential = {
          version: 1,
          merchant: intent.buyer,
          subscriptionId: verified.intent,
          network: verified.network,
          transaction,
          issuedAt: verified.blockTime,
          expiresAt: verified.blockTime + 365 * 86400,
          issuer,
        };
        return json({
          credential: finalizeEvent(
            {
              kind: 30078,
              created_at: verified.blockTime,
              tags: [
                ["d", `aislezero:membership:${intent.buyer}`],
                ["p", intent.buyer],
              ],
              content: canonical(credential),
            },
            key,
          ),
        });
      }
      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "Invalid request" },
        400,
      );
    }
  },
};
