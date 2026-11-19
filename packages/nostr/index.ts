import {
  SimplePool,
  verifyEvent,
  getEventHash,
  type Event,
  type EventTemplate,
  type Filter,
} from "nostr-tools";
import { BunkerSigner, parseBunkerInput } from "nostr-tools/nip46";
import { generateSecretKey } from "nostr-tools";
import { config } from "../config";
import { pubkeySchema, relayUrl } from "../security";
export interface Signer {
  getPublicKey(): Promise<string>;
  signEvent(event: EventTemplate): Promise<Event>;
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}
declare global {
  interface Window {
    nostr?: Signer;
  }
}
export const pool = new SimplePool({ enablePing: true, enableReconnect: true });
let signer: Signer | undefined;
export function getSigner(): Signer {
  if (!signer)
    throw new Error(
      "Connect a Nostr signing identity first. A payment wallet is a separate identity.",
    );
  return signer;
}
export async function connectIdentity(bunker?: string) {
  if (bunker) {
    const pointer = await parseBunkerInput(bunker);
    if (!pointer) throw new Error("Invalid bunker connection URL");
    const remote = BunkerSigner.fromBunker(generateSecretKey(), pointer, {
      pool,
    });
    await remote.connect();
    signer = {
      getPublicKey: () => remote.getPublicKey(),
      signEvent: (e) => remote.signEvent(e),
      nip44: {
        encrypt: (p, t) => remote.nip44Encrypt(p, t),
        decrypt: (p, t) => remote.nip44Decrypt(p, t),
      },
    };
  } else {
    if (!window.nostr)
      throw new Error(
        "Install a NIP-07 Nostr signer extension, or connect a NIP-46 remote signer. Never enter a private key here.",
      );
    signer = window.nostr;
  }
  return pubkeySchema.parse(await signer.getPublicKey());
}
export function disconnectIdentity() {
  signer = undefined;
}
export async function sign(template: EventTemplate): Promise<Event> {
  const s = getSigner();
  const pubkey = await s.getPublicKey();
  const expected = getEventHash({ ...template, pubkey });
  const event = await s.signEvent(template);
  if (!verifyEvent(event) || event.id !== expected || event.pubkey !== pubkey)
    throw new Error("Signer returned a modified or invalid event");
  return event;
}
export async function query(
  filters: Filter[],
  relays = config.relays,
  timeout = 7000,
): Promise<Event[]> {
  const unique = new Map<string, Event>();
  await Promise.allSettled(
    relays.map(async (url) => {
      const events = await pool.querySync([relayUrl(url)], filters[0], {
        maxWait: timeout,
      });
      for (const event of events)
        if (
          event.content.length < 100000 &&
          event.tags.length <= 500 &&
          verifyEvent(event) &&
          event.id === getEventHash(event) &&
          event.created_at <= Math.floor(Date.now() / 1000) + 300
        )
          unique.set(event.id, event);
    }),
  );
  if (filters.length > 1) {
    const more = await Promise.all(
      filters.slice(1).map((f) => query([f], relays, timeout)),
    );
    more.flat().forEach((e) => unique.set(e.id, e));
  }
  return [...unique.values()];
}
export interface Publication {
  relay: string;
  ok: boolean;
  error?: string;
}
export async function publish(
  event: Event,
  relays = config.relays,
): Promise<Publication[]> {
  if (!verifyEvent(event) || event.id !== getEventHash(event))
    throw new Error("Invalid event signature or ID");
  const results = await Promise.all(
    relays.map(async (url) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await Promise.any(
            pool.publish([relayUrl(url)], event, { maxWait: 7000 }),
          );
          return { relay: url, ok: true };
        } catch (e) {
          if (attempt === 1)
            return {
              relay: url,
              ok: false,
              error:
                e instanceof Error ? e.message : "Relay rejected publication",
            };
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      return { relay: url, ok: false };
    }),
  );
  if (!results.some((r) => r.ok))
    throw new Error(
      "No relay acknowledged publication. Your draft has been retained; retry when a relay is available.",
    );
  return results;
}
export async function publishTemplate(
  template: EventTemplate,
  relays = config.relays,
) {
  const event = await sign(template);
  const replication = await publish(event, relays);
  return { event, replication };
}
export function latest(events: Event[]): Event[] {
  const m = new Map<string, Event>();
  for (const e of events) {
    const d = e.tags.find((t) => t[0] === "d")?.[1] || "";
    const key = `${e.kind}:${e.pubkey}:${d}`;
    const old = m.get(key);
    if (
      !old ||
      e.created_at > old.created_at ||
      (e.created_at === old.created_at && e.id < old.id)
    )
      m.set(key, e);
  }
  return [...m.values()];
}
export async function relayHealth(url: string) {
  const started = performance.now();
  try {
    await pool.ensureRelay(relayUrl(url));
    return {
      relay: url,
      ok: true,
      latency: Math.round(performance.now() - started),
    };
  } catch {
    return { relay: url, ok: false, latency: 0 };
  }
}
