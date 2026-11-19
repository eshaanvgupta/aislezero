import {
  finalizeEvent,
  generateSecretKey,
  getEventHash,
  getPublicKey,
  nip44,
  verifyEvent,
  type Event,
} from "nostr-tools";
import { getSigner, publish, query, sign } from "../nostr";
import { config } from "../config";
import { pubkeySchema, relayUrl } from "../security";
export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  createdAt: number;
}
const randomTime = () =>
  Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800);
async function inboxRelays(pubkey: string) {
  const records = await query([
    { kinds: [10050], authors: [pubkey], limit: 5 },
  ]);
  const newest = records.sort((a, b) => b.created_at - a.created_at)[0];
  const relays =
    newest?.tags
      .filter((t) => t[0] === "relay")
      .map((t) => relayUrl(t[1]))
      .slice(0, 3) || [];
  if (!relays.length)
    throw new Error(
      `Recipient ${pubkey.slice(0, 12)} has not published a NIP-17 inbox. Ask them to enable private messaging first.`,
    );
  return relays;
}
export async function enableInbox(relays = config.relays.slice(0, 2)) {
  return publish(
    await sign({
      kind: 10050,
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      tags: relays.map((r) => ["relay", relayUrl(r)]),
    }),
  );
}
export async function sendMessage(
  recipient: string,
  content: string,
): Promise<Message> {
  pubkeySchema.parse(recipient);
  if (!content.trim() || content.length > 30000)
    throw new Error("Message must contain 1–30,000 characters");
  const signer = getSigner();
  if (!signer.nip44)
    throw new Error(
      "Your Nostr signer must support NIP-44 encryption for private messages",
    );
  const sender = await signer.getPublicKey();
  const targets = [...new Set([recipient, sender])];
  // Discover every required inbox before creating or publishing any envelope.
  const destinations = await Promise.all(targets.map(inboxRelays));
  const rumor = {
    kind: 14,
    pubkey: sender,
    content,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["p", recipient]],
  };
  const id = getEventHash(rumor);
  const message = { ...rumor, id };
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const seal = await sign({
      kind: 13,
      tags: [],
      created_at: randomTime(),
      content: await signer.nip44.encrypt(target, JSON.stringify(message)),
    });
    const ephemeral = generateSecretKey();
    const wrapped = finalizeEvent(
      {
        kind: 1059,
        created_at: randomTime(),
        tags: [["p", target]],
        content: nip44.v2.encrypt(
          JSON.stringify(seal),
          nip44.v2.utils.getConversationKey(ephemeral, target),
        ),
      },
      ephemeral,
    );
    await publish(wrapped, destinations[i]);
  }
  return { id, sender, recipient, content, createdAt: rumor.created_at };
}
export async function unwrapMessage(wrapped: Event): Promise<Message | null> {
  try {
    const signer = getSigner();
    if (!signer.nip44) return null;
    const me = await signer.getPublicKey();
    if (
      !verifyEvent(wrapped) ||
      wrapped.kind !== 1059 ||
      !wrapped.tags.some((t) => t[0] === "p" && t[1] === me)
    )
      return null;
    const seal = JSON.parse(
      await signer.nip44.decrypt(wrapped.pubkey, wrapped.content),
    ) as Event;
    if (seal.kind !== 13 || !verifyEvent(seal)) return null;
    const rumor = JSON.parse(
      await signer.nip44.decrypt(seal.pubkey, seal.content),
    );
    if (
      rumor.kind !== 14 ||
      rumor.pubkey !== seal.pubkey ||
      rumor.id !== getEventHash(rumor) ||
      typeof rumor.content !== "string" ||
      rumor.content.length > 30000
    )
      return null;
    const recipient = rumor.tags.find((t: string[]) => t[0] === "p")?.[1];
    if (rumor.pubkey !== me && recipient !== me) return null;
    return {
      id: rumor.id,
      sender: rumor.pubkey,
      recipient,
      content: rumor.content,
      createdAt: rumor.created_at,
    };
  } catch {
    return null;
  }
}
export async function loadMessages() {
  const me = await getSigner().getPublicKey();
  const relays = await inboxRelays(me);
  const events = await query(
    [{ kinds: [1059], "#p": [me], limit: 200 }],
    relays,
  );
  const messages = await Promise.all(events.map(unwrapMessage));
  return [
    ...new Map(
      messages.filter((m): m is Message => !!m).map((m) => [m.id, m]),
    ).values(),
  ].sort((a, b) => a.createdAt - b.createdAt);
}
