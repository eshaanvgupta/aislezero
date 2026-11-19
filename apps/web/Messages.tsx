import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LockKeyhole, Send, RefreshCw, MessageCircle } from "lucide-react";
import { useApp } from "./state";
import OfferActions from "./OfferActions";
import { PageTitle, Empty } from "./components";
import {
  enableInbox,
  loadMessages,
  sendMessage,
  type Message,
} from "../../packages/messaging";
import { canTransition, orderSchema } from "../../packages/commerce/schema";
import { verifyPayment, validateIntent } from "../../packages/payments";
import { errorMessage } from "../../packages/security";
import { savePrivate, readPrivate } from "../../packages/local";
export default function Messages({ mode = "messages" }: { mode?: string }) {
  const a = useApp();
  const [params] = useSearchParams();
  const [recipient, setRecipient] = useState(params.get("to") || ""),
    [text, setText] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (a.identity)
      void readPrivate<Message[]>("messages:" + a.identity).then((m) => {
        if (m) setMessages(m);
      });
  }, [a.identity]);
  const refresh = async () => {
    setBusy(true);
    try {
      const received = await loadMessages();
      setMessages(received);
      await savePrivate("messages:" + a.identity, received);
      let next = [...a.orders];
      for (const m of received) {
        try {
          const body = JSON.parse(m.content);
          if (body.type !== "aislezero:order") continue;
          const order = orderSchema.parse(body.order);
          if (
            ![order.buyer, order.seller].includes(m.sender) ||
            ![order.buyer, order.seller].includes(a.identity)
          )
            continue;
          const old = next.find((o) => o.id === order.id);
          if (!old) {
            if (
              order.state === "requested" &&
              [order.buyer, order.seller].includes(m.sender)
            )
              next.push(order);
            continue;
          }
          if (
            old.buyer !== order.buyer ||
            old.seller !== order.seller ||
            old.listing !== order.listing ||
            old.quantity !== order.quantity ||
            old.createdAt !== order.createdAt
          )
            continue;
          const role = m.sender === order.seller ? "seller" : "buyer";
          if (order.state === "verified" && order.receipt) {
            try {
              const intent = validateIntent(
                order.paymentRequest as any,
                { seller: order.seller, buyer: order.buyer, orderId: order.id },
                (order.paymentRequest as any)?.created_at,
              );
              await verifyPayment(intent, order.receipt);
              next = next.map((o) => (o.id === order.id ? order : o));
            } catch {
              /* Never accept an unverified remote paid status */
            }
          } else if (canTransition(old.state, order.state, role)) {
            if (order.state === "awaiting-payment")
              validateIntent(order.paymentRequest as any, {
                seller: order.seller,
                buyer: order.buyer,
                orderId: order.id,
              });
            next = next.map((o) => (o.id === order.id ? order : o));
          }
        } catch {
          /* Human messages and unrelated application payloads remain readable */
        }
      }
      a.setOrders(next);
      a.notify("Private inbox refreshed; authorized order updates reconciled");
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    setBusy(true);
    try {
      const sent = await sendMessage(recipient, text);
      setMessages((old) => [...old, sent]);
      setText("");
      a.notify("Encrypted message acknowledged by recipient inbox relays");
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const visible = messages.filter(
    (m) =>
      (!recipient || m.sender === recipient || m.recipient === recipient) &&
      (mode === "messages" ||
        m.content.includes(
          mode === "offers" ? "aislezero:offer" : "aislezero:rfq",
        )),
  );
  const peers = [
    ...new Set(
      messages.map((m) => (m.sender === a.identity ? m.recipient : m.sender)),
    ),
  ];
  return (
    <>
      <PageTitle
        eyebrow="BETWEEN YOU AND THE MERCHANT"
        title={
          mode === "offers"
            ? "A better offer starts with a conversation."
            : mode === "rfqs"
              ? "Your sourcing conversations."
              : "A more personal connection."
        }
        description="NIP-17 private messages are encrypted to participants and replicated to their chosen inbox relays."
      />
      <div className="toolbar">
        <button
          className="button secondary"
          disabled={busy || !a.identity}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} />
          Refresh private inbox
        </button>
        <button
          className="button secondary"
          disabled={!a.identity || busy}
          onClick={() => {
            setBusy(true);
            void enableInbox(a.relays.slice(0, 2))
              .then(() => a.notify("Private inbox relays published"))
              .catch((e) => a.notify(errorMessage(e)))
              .finally(() => setBusy(false));
          }}
        >
          Enable my private inbox
        </button>
      </div>
      <div className="messenger">
        <aside>
          <h3>Your conversations</h3>
          {peers.map((peer) => (
            <button
              className={peer === recipient ? "active" : ""}
              key={peer}
              onClick={() => setRecipient(peer)}
            >
              <MessageCircle size={18} />
              <span>{a.profiles[peer]?.name || peer.slice(0, 16)}</span>
            </button>
          ))}
          {!peers.length && (
            <p className="muted">Your conversations will appear here.</p>
          )}
        </aside>
        <section>
          <div className="conversation-header">
            <LockKeyhole size={18} />
            <span>Private, direct conversation</span>
          </div>
          <div className="message-stream">
            {visible.length ? (
              visible.map((m) => (
                <div
                  className={
                    "message " + (m.sender === a.identity ? "outgoing" : "")
                  }
                  key={m.id}
                >
                  <small>
                    {a.profiles[m.sender]?.name || m.sender.slice(0, 12)}
                  </small>
                  <p>{formatMessage(m.content)}</p>
                  <OfferActions message={m} />
                  <time>{new Date(m.createdAt * 1000).toLocaleString()}</time>
                </div>
              ))
            ) : (
              <div className="message-empty">
                <LockKeyhole size={34} />
                <h3>Good commerce starts with a conversation.</h3>
                <p>
                  Confirm availability, ask questions, and agree on terms
                  directly.
                </p>
              </div>
            )}
          </div>
          <form
            className="message-compose"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label>
              Recipient Nostr public key
              <input
                required
                value={recipient}
                maxLength={64}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="64-character hexadecimal public key"
              />
            </label>
            <label>
              Your message
              <textarea
                required
                value={text}
                maxLength={30000}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Start a conversation…"
              />
            </label>
            <button className="button" disabled={busy || !a.identity}>
              <Send size={16} />
              Send privately
            </button>
          </form>
        </section>
      </div>
      <p className="fine">
        Your signer must support NIP-44. Both participants must publish a kind
        10050 inbox. Some inbox relays require NIP-42 authentication that this
        client does not yet negotiate; choose a compatible relay. Message
        history is decrypted only in your browser.
      </p>
    </>
  );
}
function formatMessage(content: string) {
  try {
    const v = JSON.parse(content);
    if (v.type === "aislezero:order")
      return `Order ${v.order.id.slice(0, 8)} · ${v.order.title}\nStatus: ${v.order.state}\n${v.order.note || ""}${v.order.tracking ? "\nTracking: " + v.order.tracking : ""}`;
    if (v.type === "aislezero:offer")
      return `Private offer: ${v.price} ${v.currency} for ${v.quantity} units\nListing: ${v.listing}\nExpires: ${new Date(v.expiresAt * 1000).toLocaleString()}`;
  } catch {}
  return content;
}
