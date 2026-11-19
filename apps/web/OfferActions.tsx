import { useState } from "react";
import { useApp } from "./state";
import { offerSchema, orderSchema } from "../../packages/commerce/schema";
import { sendMessage, type Message } from "../../packages/messaging";
import { errorMessage } from "../../packages/security";
export default function OfferActions({ message }: { message: Message }) {
  const a = useApp();
  const [counter, setCounter] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  let offer;
  try {
    offer = offerSchema.parse(JSON.parse(message.content));
  } catch {
    return null;
  }
  const me = a.identity;
  const recipient = message.sender === me ? message.recipient : message.sender;
  if (
    done ||
    offer.expiresAt < Date.now() / 1000 ||
    !["offered", "countered"].includes(offer.state) ||
    message.sender === me
  )
    return null;
  const seller = offer.listing.split(":")[1];
  const act = async (action: "accepted" | "declined" | "countered") => {
    setBusy(true);
    try {
      const response = offerSchema.parse({
        ...offer,
        id: crypto.randomUUID(),
        parentId: offer.id,
        state: action,
        ...(action === "countered" ? { price: counter } : {}),
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
      });
      await sendMessage(recipient, JSON.stringify(response));
      if (action === "accepted" && seller === me) {
        const p = a.listings.find(
          (p) => `30402:${p.seller}:${p.id}` === offer.listing,
        );
        if (!p) throw new Error("Original product is unavailable");
        const order = orderSchema.parse({
          version: 1,
          id: crypto.randomUUID(),
          buyer: recipient,
          seller: me,
          listing: offer.listing,
          title: p.title,
          quantity: offer.quantity,
          variants: {},
          state: "requested",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          note: `Accepted private offer ${offer.price} USD for product subtotal. Confirm final shipping and taxes.`,
        });
        a.setOrders((old) => [...old, order]);
        await sendMessage(
          recipient,
          JSON.stringify({ type: "aislezero:order", order }),
        );
      }
      setDone(true);
      a.notify("Private offer response sent");
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="offer-actions">
      <div className="toolbar">
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void act("accepted")}
        >
          Accept offer
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void act("declined")}
        >
          Decline
        </button>
      </div>
      <label>
        Counter total, USD
        <input
          value={counter}
          onChange={(e) => setCounter(e.target.value)}
          inputMode="decimal"
        />
      </label>
      <button
        className="text-button"
        disabled={busy || Number(counter) <= 0}
        onClick={() => void act("countered")}
      >
        Send counteroffer
      </button>
    </div>
  );
}
