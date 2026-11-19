import { z } from "zod";
import type { Event } from "nostr-tools";
import { canonical, pubkeySchema, safeUrl } from "../security";
export const assetIds = [
  "BTC:bitcoin",
  "ETH:ethereum",
  "BNB:bnb",
  "SOL:solana",
  "USDC:ethereum",
  "USDT:ethereum",
  "USDC:solana",
  "USDT:solana",
] as const;
export type AssetId = (typeof assetIds)[number];
export const amountSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d{0,14})(\.\d{1,8})?$/,
    "Use a positive decimal with up to 8 places",
  );
const mediaSchema = z.object({
  url: z.string().transform(safeUrl),
  alt: z.string().max(240),
  type: z.enum(["image", "video"]).default("image"),
});
export const extensionSchema = z.object({
  version: z.literal(1),
  sku: z.string().max(100).default(""),
  brand: z.string().max(100).default(""),
  condition: z.enum(["new", "like-new", "good", "fair"]).default("new"),
  quantity: z.number().int().min(0).max(100000000),
  country: z.string().max(100),
  shipsTo: z.array(z.string().max(100)).max(100),
  shipping: amountSchema,
  tax: amountSchema.default("0"),
  dispatchDays: z.number().int().min(0).max(730),
  delivery: z.string().max(240),
  returns: z.string().max(4000),
  warranty: z.string().max(1000).default(""),
  assets: z.array(z.enum(assetIds)).min(1),
  addresses: z.record(z.string(), z.string().max(120)),
  media: z.array(mediaSchema).max(12),
  specifications: z
    .record(z.string().max(100), z.string().max(500))
    .default({}),
  variants: z
    .array(
      z.object({
        name: z.string().max(80),
        options: z.array(z.string().max(80)).max(30),
      }),
    )
    .max(8)
    .default([]),
  wholesale: z.boolean().default(false),
  moq: z.number().int().min(1).max(10000000).default(1),
  tiers: z
    .array(z.object({ quantity: z.number().int().min(1), price: amountSchema }))
    .max(20)
    .default([]),
  customization: z.string().max(1000).default(""),
  collection: z.string().max(100).default(""),
});
export type Extension = z.infer<typeof extensionSchema>;
export const listingInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[\w-]+$/),
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(20000),
  category: z.string().max(100),
  price: amountSchema.refine((v) => Number(v) > 0),
  currency: z.literal("USD"),
  extension: extensionSchema,
});
export type ListingInput = z.infer<typeof listingInputSchema>;
export interface Listing extends ListingInput {
  seller: string;
  createdAt: number;
  event: Event;
  status: string;
  member: boolean;
}
export const defaultExtension: Extension = {
  version: 1,
  sku: "",
  brand: "",
  condition: "new",
  quantity: 1,
  country: "",
  shipsTo: [],
  shipping: "0",
  tax: "0",
  dispatchDays: 3,
  delivery: "Contact merchant for an estimate",
  returns: "Contact merchant before returning an item.",
  warranty: "",
  assets: ["ETH:ethereum"],
  addresses: {},
  media: [],
  specifications: {},
  variants: [],
  wholesale: false,
  moq: 1,
  tiers: [],
  customization: "",
  collection: "",
};
export function listingTemplate(input: ListingInput, active = true) {
  const v = listingInputSchema.parse(input);
  return {
    kind: active ? 30402 : 30403,
    created_at: Math.floor(Date.now() / 1000),
    content: v.description,
    tags: [
      ["d", v.id],
      ["title", v.title],
      ["price", v.price, v.currency],
      ["t", v.category],
      ["status", active ? "active" : "inactive"],
      ["location", v.extension.country],
      ["published_at", String(Math.floor(Date.now() / 1000))],
      ...v.extension.media.map((m) => ["image", m.url]),
      ["aislezero", "1", canonical(v.extension)],
    ],
  };
}
export function parseListing(event: Event): Listing | null {
  try {
    if (
      ![30402, 30403].includes(event.kind) ||
      event.content.length > 20000 ||
      event.tags.length > 200
    )
      return null;
    const tag = (k: string) => event.tags.find((t) => t[0] === k)?.[1] || "";
    const ext = event.tags.find(
      (t) => t[0] === "aislezero" && t[1] === "1",
    )?.[2];
    // Unextended NIP-99 listings remain readable; unsupported payment details require seller confirmation.
    const extension = ext
      ? extensionSchema.parse(JSON.parse(ext))
      : {
          ...defaultExtension,
          country: tag("location"),
          assets: [],
          media: event.tags
            .filter((t) => t[0] === "image")
            .slice(0, 12)
            .map((t) => ({
              url: safeUrl(t[1]),
              alt: tag("title"),
              type: "image" as const,
            })),
        };
    const priceTag = event.tags.find((t) => t[0] === "price");
    if (priceTag?.[2]?.toUpperCase() !== "USD") return null;
    const price = tag("price");
    amountSchema.parse(price);
    return {
      id: tag("d"),
      title: tag("title").slice(0, 160),
      description: event.content,
      category: tag("t"),
      price,
      currency: "USD",
      extension,
      seller: event.pubkey,
      createdAt: event.created_at,
      event,
      status: tag("status") || (event.kind === 30403 ? "inactive" : "active"),
      member: false,
    };
  } catch {
    return null;
  }
}
const optionalMediaUrl = z
  .string()
  .transform((v) => (v ? safeUrl(v) : ""))
  .optional();
export const profileSchema = z.object({
  name: z.string().min(2).max(80),
  about: z.string().max(4000),
  country: z.string().max(100),
  shipsTo: z.array(z.string()).default([]),
  picture: optionalMediaUrl,
  banner: optionalMediaUrl,
  accent: z
    .string()
    .regex(/^#[a-fA-F0-9]{6}$/)
    .default("#4056f4"),
  policies: z.string().max(5000).default(""),
  addresses: z.record(z.string(), z.string()).default({}),
});
export type Profile = z.infer<typeof profileSchema>;
export const orderSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  buyer: pubkeySchema,
  seller: pubkeySchema,
  listing: z.string().max(300),
  title: z.string().max(160),
  quantity: z.number().int().positive(),
  variants: z.record(z.string(), z.string()).default({}),
  state: z.enum([
    "requested",
    "accepted",
    "awaiting-payment",
    "submitted",
    "verified",
    "preparing",
    "shipped",
    "delivered",
    "received",
    "cancelled",
    "refund-reported",
  ]),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  note: z.string().max(5000).default(""),
  tracking: z.string().max(500).default(""),
  paymentRequest: z.unknown().optional(),
  receipt: z.string().optional(),
});
export type Order = z.infer<typeof orderSchema>;
export const offerSchema = z.object({
  type: z.literal("aislezero:offer"),
  version: z.literal(1),
  id: z.string().uuid(),
  listing: z.string().max(300),
  quantity: z.number().int().positive(),
  price: amountSchema.refine((v) => Number(v) > 0),
  currency: z.literal("USD"),
  expiresAt: z.number().int(),
  state: z
    .enum(["offered", "accepted", "declined", "countered"])
    .default("offered"),
  parentId: z.string().uuid().optional(),
});
export const rfqSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  requirements: z.string().min(10).max(10000),
  quantity: z.number().int().positive().max(100000000),
  budget: z.string().max(200),
  destination: z.string().min(1).max(200),
  deliveryDate: z.string().max(100),
  expiresAt: z.number().int(),
});
export function canTransition(
  from: Order["state"],
  to: Order["state"],
  role: "buyer" | "seller" | "verifier",
) {
  const rules: Record<string, Partial<Record<typeof role, string[]>>> = {
    requested: { seller: ["accepted", "cancelled"], buyer: ["cancelled"] },
    accepted: { seller: ["awaiting-payment", "cancelled"] },
    "awaiting-payment": { buyer: ["submitted", "cancelled"] },
    submitted: { verifier: ["verified"] },
    verified: { seller: ["preparing", "refund-reported"] },
    preparing: { seller: ["shipped", "refund-reported"] },
    shipped: { seller: ["delivered"], buyer: ["received"] },
    delivered: { buyer: ["received"] },
    received: { seller: ["refund-reported"] },
  };
  return rules[from]?.[role]?.includes(to) || false;
}
