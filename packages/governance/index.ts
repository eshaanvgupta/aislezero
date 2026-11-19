import { z } from "zod";
import { verifyEvent, getEventHash, type Event } from "nostr-tools";
export const governanceSchema = z.object({
  version: z.literal(1),
  blockedListings: z.array(z.string().max(300)).max(10000),
  blockedMerchants: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(10000),
  reasons: z.record(z.string(), z.string().max(2000)),
  prohibitedCategories: z.array(z.string()).max(100),
  restrictedCountries: z.array(z.string()).max(200),
  featuredMerchants: z.array(z.string()).max(100),
  policyVersion: z.string().max(100),
});
export type Governance = z.infer<typeof governanceSchema>;
export const defaultGovernance: Governance = {
  version: 1,
  blockedListings: [],
  blockedMerchants: [],
  reasons: {},
  prohibitedCategories: [
    "weapons",
    "stolen-goods",
    "counterfeit",
    "illegal-drugs",
    "exploitation",
  ],
  restrictedCountries: [],
  featuredMerchants: [],
  policyVersion: "1",
};
export function parseGovernance(
  event: Event,
  operator: string,
): Governance | null {
  try {
    if (
      !operator ||
      event.pubkey !== operator ||
      event.kind !== 30078 ||
      event.tags.find((t) => t[0] === "d")?.[1] !== "aislezero:governance:v1" ||
      !verifyEvent(event) ||
      event.id !== getEventHash(event)
    )
      return null;
    return governanceSchema.parse(JSON.parse(event.content));
  } catch {
    return null;
  }
}
