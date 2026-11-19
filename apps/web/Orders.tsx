import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "./state";
import { PageTitle, Empty } from "./components";
import { canTransition, type Order } from "../../packages/commerce/schema";
import { sendMessage } from "../../packages/messaging";
import { sign } from "../../packages/nostr";
import { canonical, download, errorMessage } from "../../packages/security";
import {
  freshRate,
  quoteUnits,
  type PaymentIntent,
} from "../../packages/payments";
import { assets, getAsset } from "../../packages/payments/assets";
import Decimal from "decimal.js";
import Reviews from "./Reviews";
export default function Orders({
  seller = false,
  compact = false,
}: {
  seller?: boolean;
  compact?: boolean;
}) {
  const a = useApp();
  const [busy, setBusy] = useState(false),
    [assetId, setAssetId] = useState("ETH:ethereum"),
    [note, setNote] = useState("");
  const orders = a.orders.filter(
    (o) => (seller ? o.seller : o.buyer) === a.identity,
  );
  const transition = async (o: Order, to: Order["state"]) => {
    setBusy(true);
    try {
      if (!canTransition(o.state, to, seller ? "seller" : "buyer"))
        throw new Error("You are not authorized for this order transition");
      let next = {
        ...o,
        state: to,
        updatedAt: Date.now(),
        ...(note
          ? { note, tracking: to === "shipped" ? note : o.tracking }
          : {}),
      };
      if (to === "awaiting-payment") {
        const p = a.listings.find(
          (p) => `30402:${p.seller}:${p.id}` === o.listing,
        );
        if (!p || !p.member || p.extension.quantity < o.quantity)
          throw new Error(
            "Current listing, membership and sufficient merchant-confirmed stock are required",
          );
        if (!p.extension.assets.includes(assetId as never))
          throw new Error("This product does not accept that asset/network");
        const asset = getAsset(assetId),
          rate = await freshRate(asset),
          usd = new Decimal(p.price)
            .mul(o.quantity)
            .plus(p.extension.shipping)
            .plus(p.extension.tax)
            .toFixed();
        const createdAt = Math.floor(Date.now() / 1000);
        const intent: PaymentIntent = {
          version: 1,
          orderId: o.id,
          listing: o.listing,
          buyer: o.buyer,
          seller: o.seller,
          asset: assetId,
          recipient: p.extension.addresses[asset.network] || "",
          units: quoteUnits(usd, rate.rate, asset.decimals).toString(),
          createdAt,
          expiresAt: createdAt + 900,
          usd,
          source: rate.source,
          rate: rate.rate,
          purpose: "purchase",
        };
        next = {
          ...next,
          paymentRequest: await sign({
            kind: 30078,
            created_at: createdAt,
            tags: [["d", `aislezero:payment:${o.id}`]],
            content: canonical(intent),
          }),
        };
      }
      await sendMessage(
        seller ? o.buyer : o.seller,
        JSON.stringify({ type: "aislezero:order", order: next }),
      );
      a.setOrders((old) => old.map((x) => (x.id === o.id ? next : x)));
      a.notify("Authorized order update sent privately");
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!compact && (
        <PageTitle
          eyebrow="DIRECT FROM MERCHANT TO BUYER"
          title={
            seller ? "Keep your orders moving." : "Your independent finds."
          }
          description="Orders are participant-controlled records. Retrieve your private inbox to synchronize authorized updates."
        >
          <Link
            className="button secondary"
            to={seller ? "/seller/messages" : "/account/messages"}
          >
            Sync private inbox
          </Link>
        </PageTitle>
      )}
      {orders.length ? (
        orders.map((o) => (
          <article className="panel order-card" key={o.id}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">ORDER {o.id.slice(0, 8)}</span>
                <h3>{o.title}</h3>
              </div>
              <span
                className={
                  "pill " +
                  (["verified", "received"].includes(o.state) ? "success" : "")
                }
              >
                {o.state.replaceAll("-", " ")}
              </span>
            </div>
            <p>
              {o.quantity} units · {new Date(o.createdAt).toLocaleDateString()}
            </p>
            {o.tracking && <p>Merchant tracking reference: {o.tracking}</p>}
            <p className="description">{o.note}</p>
            {seller && o.state === "accepted" && (
              <label>
                Payment asset & network
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                >
                  {assets.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.symbol} · {x.network}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {seller && ["verified", "preparing"].includes(o.state) && (
              <label>
                Fulfilment note / tracking reference
                <input value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            )}
            <div className="toolbar">
              {(
                [
                  "accepted",
                  "awaiting-payment",
                  "preparing",
                  "shipped",
                  "delivered",
                  "received",
                  "cancelled",
                  "refund-reported",
                ] as Order["state"][]
              )
                .filter((s) =>
                  canTransition(o.state, s, seller ? "seller" : "buyer"),
                )
                .map((to) => (
                  <button
                    className="button secondary"
                    key={to}
                    disabled={busy}
                    onClick={() => void transition(o, to)}
                  >
                    {to === "accepted"
                      ? "Confirm stock & terms"
                      : to === "awaiting-payment"
                        ? "Sign exact payment request"
                        : to === "received"
                          ? "Confirm receipt"
                          : to.replaceAll("-", " ")}
                  </button>
                ))}
              {!seller &&
                ["awaiting-payment", "submitted"].includes(o.state) && (
                  <Link className="button" to="/checkout">
                    Review direct payment
                  </Link>
                )}
              <button
                className="text-button"
                onClick={() =>
                  download(
                    "order-" + o.id + ".json",
                    JSON.stringify(o, null, 2),
                  )
                }
              >
                Download record
              </button>
              <Link
                className="text-button"
                to={
                  (seller ? "/seller" : "/account") +
                  "/messages?to=" +
                  (seller ? o.buyer : o.seller)
                }
              >
                Message {seller ? "buyer" : "merchant"}
              </Link>
            </div>
            {!seller && o.state === "received" && (
              <Reviews seller={o.seller} order={o} />
            )}
          </article>
        ))
      ) : (
        <Empty
          title="A little room for your next chapter."
          description="Your orders appear here after a private purchase request. Refresh your inbox to retrieve records from independent relays."
          action="Explore marketplace"
        />
      )}
    </>
  );
}
