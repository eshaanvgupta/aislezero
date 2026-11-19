import { useState } from "react";
import { useApp } from "./state";
import { query, latest, publishTemplate } from "../../packages/nostr";
import { verifyReview, reviewSchema } from "../../packages/reviews";
import { canonical, errorMessage } from "../../packages/security";
import type { Order } from "../../packages/commerce/schema";
export default function Reviews({
  seller,
  order,
}: {
  seller: string;
  order?: Order;
}) {
  const a = useApp();
  const [reviews, setReviews] = useState<
      Awaited<ReturnType<typeof verifyReview>>[]
    >([]),
    [busy, setBusy] = useState(false),
    [text, setText] = useState(""),
    [rating, setRating] = useState(5),
    [checked, setChecked] = useState(false);
  const load = async () => {
    setBusy(true);
    try {
      const events = await query(
        [{ kinds: [31555], "#p": [seller], limit: 50 }],
        a.relays,
      );
      const result = await Promise.allSettled(latest(events).map(verifyReview));
      setReviews(
        result.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
      );
      setChecked(true);
      a.notify("Only independently payment-verified reviews are shown");
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    try {
      if (
        !order?.receipt ||
        !order.paymentRequest ||
        order.buyer !== a.identity ||
        !["received", "delivered"].includes(order.state)
      )
        throw new Error(
          "A completed order and signed payment proof are required",
        );
      const request = order.paymentRequest as any;
      const intent = JSON.parse(request.content);
      const value = reviewSchema.parse({
        version: 1,
        seller,
        listing: order.listing,
        rating,
        text,
        transaction: order.receipt,
        paymentRequest: request,
      });
      const event = await (
        await import("../../packages/nostr")
      ).sign({
        kind: 31555,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["d", `${intent.asset}:${order.receipt}`],
          ["p", seller],
          ["a", order.listing],
        ],
        content: canonical(value),
      });
      await verifyReview(event);
      await (await import("../../packages/nostr")).publish(event, a.relays);
      setText("");
      a.notify("Purchase-linked review signed and published");
      await load();
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <h2>
        {order ? "Share your experience." : "Experiences with this merchant."}
      </h2>
      {order ? (
        <>
          <p>
            Reviews are public. Publishing discloses your Nostr identity,
            transaction reference and seller-signed payment request. Private
            shipping details are excluded.
          </p>
          <label>
            Rating
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option value={n} key={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </label>
          <label>
            Your review
            <textarea
              value={text}
              minLength={10}
              maxLength={4000}
              onChange={(e) => setText(e.target.value)}
              rows={3}
            />
          </label>
          <button
            className="button secondary"
            disabled={busy || text.length < 10}
            onClick={() => void submit()}
          >
            Sign & publish public review
          </button>
        </>
      ) : (
        <>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void load()}
          >
            Load purchase-linked reviews
          </button>
          {reviews.map((r) => (
            <article key={r.transaction} className="panel">
              <span className="pill success">
                Purchase-linked · {r.rating} / 5
              </span>
              <p className="description">{r.text}</p>
              <small className="mono">{r.buyer.slice(0, 16)}</small>
            </article>
          ))}
          {checked && !reviews.length && (
            <p>
              No independently verifiable purchase-linked reviews are available
              from these relays.
            </p>
          )}
        </>
      )}
      <p className="fine">
        A verified payment does not prove delivery or merchant legitimacy. Each
        buyer has one replaceable review per asset/network and transaction
        reference.
      </p>
    </section>
  );
}
