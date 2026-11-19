import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, ShieldCheck, Trash2, Check, Clock } from "lucide-react";
import { useApp, listingKey } from "./state";
import { PageTitle, Empty } from "./components";
import { orderSchema, type Order } from "../../packages/commerce/schema";
import { sendMessage } from "../../packages/messaging";
import {
  validateIntent,
  verifyPayment,
  formatUnits,
  type PaymentIntent,
} from "../../packages/payments";
import { getAsset } from "../../packages/payments/assets";
import { pay } from "../../packages/wallets";
import { config } from "../../packages/config";
import { errorMessage } from "../../packages/security";
import type { Event } from "nostr-tools";
export default function Checkout({ cartOnly = false }: { cartOnly?: boolean }) {
  const a = useApp();
  const [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(0),
    [tx, setTx] = useState("");
  const items = a.cart.map((i) => ({
    item: i,
    product: a.listings.find((p) => listingKey(p) === listingKey(i)),
  }));
  const request = async () => {
    setBusy(true);
    try {
      if (!a.identity)
        throw new Error(
          "Connect a Nostr identity to request your purchase privately",
        );
      for (const { item, product: p } of items) {
        if (!p || !p.member)
          throw new Error(
            "An item is unavailable or its membership has expired",
          );
        const order = orderSchema.parse({
          version: 1,
          id: crypto.randomUUID(),
          buyer: a.identity,
          seller: p.seller,
          listing: `30402:${p.seller}:${p.id}`,
          title: p.title,
          quantity: item.quantity,
          variants: item.variants,
          state: "requested",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          note: "Please confirm pricing, availability, shipping and payment details.",
        });
        await sendMessage(
          p.seller,
          JSON.stringify({ type: "aislezero:order", order }),
        );
        a.setOrders((old) => [...old, order]);
      }
      a.setCart([]);
      a.notify(
        "Private purchase requests sent. Confirmed payment requests will appear in your orders.",
      );
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const orders = a.orders.filter(
    (o) =>
      o.buyer === a.identity &&
      ["awaiting-payment", "submitted"].includes(o.state),
  );
  const settle = async (o: Order, verifyOnly = false) => {
    setBusy(true);
    try {
      const signed = o.paymentRequest as Event;
      const intent = validateIntent(signed, {
        seller: o.seller,
        buyer: a.identity,
        orderId: o.id,
        listing: o.listing,
      });
      if (!config.paymentsEnabled)
        throw new Error(
          "Mainnet checkout is disabled until operator configuration and activation are complete",
        );
      let hash = o.receipt || tx;
      if (!verifyOnly) {
        if (!a.wallets[selected])
          throw new Error("Connect and select a payment wallet");
        hash = await pay(intent, a.wallets[selected]);
        a.setOrders((old) =>
          old.map((x) =>
            x.id === o.id ? { ...x, state: "submitted", receipt: hash } : x,
          ),
        );
        setTx(hash);
        a.notify(
          "Transaction submitted. Independent confirmation is still required.",
        );
        return;
      }
      if (!hash) throw new Error("Enter a transaction reference");
      if (a.orders.some((x) => x.id !== o.id && x.receipt === hash))
        throw new Error(
          "This receipt is already associated with another order",
        );
      await verifyPayment(intent, hash);
      const next = {
        ...o,
        state: "verified" as const,
        receipt: hash,
        updatedAt: Date.now(),
      };
      a.setOrders((old) => old.map((x) => (x.id === o.id ? next : x)));
      await sendMessage(
        o.seller,
        JSON.stringify({ type: "aislezero:order", order: next }),
      );
      a.notify("Payment independently verified. Merchant fulfilment is next.");
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <PageTitle
        eyebrow="GOOD FINDS, ALL TOGETHER"
        title={cartOnly ? "Your shopping bag." : "A more direct checkout."}
        description="You buy from each independent merchant directly. Every order starts with a seller confirmation."
      >
        <Link className="button secondary" to="/account/orders">
          View your orders
        </Link>
      </PageTitle>
      {items.length > 0 ? (
        <div className="checkout-layout">
          <div className="cart-items">
            {items.map(({ item, product: p }) => (
              <article className="cart-item" key={listingKey(item)}>
                {p?.extension.media[0] ? (
                  <img src={p.extension.media[0].url} alt={p.title} />
                ) : (
                  <ShoppingBag size={32} />
                )}
                <div>
                  <h3>{p?.title || "Listing unavailable"}</h3>
                  <p className="muted">
                    {a.profiles[item.seller]?.name || item.seller.slice(0, 16)}
                  </p>
                  <p>
                    {Object.entries(item.variants)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </p>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        a.setCart(
                          a.cart.map((i) =>
                            listingKey(i) === listingKey(item)
                              ? {
                                  ...i,
                                  quantity: Math.max(1, Number(e.target.value)),
                                }
                              : i,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <b>${p ? (Number(p.price) * item.quantity).toFixed(2) : "—"}</b>
                <button
                  className="icon-button"
                  aria-label="Remove item"
                  onClick={() =>
                    a.setCart(
                      a.cart.filter((i) => listingKey(i) !== listingKey(item)),
                    )
                  }
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
          </div>
          <aside className="summary-card">
            <h2>Your next step.</h2>
            <p>
              Request seller-confirmed pricing and stock. Payment becomes
              available only after the merchant sends a signed request.
            </p>
            <div className="cost-lines">
              <span>
                Estimated product subtotal
                <b>
                  $
                  {items
                    .reduce(
                      (s, { item, product: p }) =>
                        s + Number(p?.price || 0) * item.quantity,
                      0,
                    )
                    .toFixed(2)}
                </b>
              </span>
              <span>
                Platform commission<b>$0.00</b>
              </span>
              <span>
                Shipping & taxes<b>Seller confirms</b>
              </span>
              <span>
                Network fees<b>Wallet estimates</b>
              </span>
            </div>
            {!a.identity && (
              <button
                className="button secondary full"
                onClick={() => a.setWalletModal(true)}
              >
                Connect messaging identity
              </button>
            )}
            {cartOnly ? (
              <Link className="button full" to="/checkout">
                Continue to checkout
              </Link>
            ) : (
              <button
                className="button full"
                disabled={busy || !a.identity}
                onClick={() => void request()}
              >
                Request merchant confirmation
              </button>
            )}
            <p className="fine">
              <ShieldCheck size={16} />
              No funds move when you request confirmation.
            </p>
          </aside>
        </div>
      ) : (
        <Empty
          title="Your bag has room for a good find."
          description="Explore independent stores and add something you love. Your bag stays on this device."
        />
      )}
      {!cartOnly && orders.length > 0 && (
        <section className="section">
          <h2>Merchant-confirmed payments.</h2>
          {orders.map((o) => {
            let intent: PaymentIntent | undefined;
            let error = "";
            try {
              intent = validateIntent(o.paymentRequest as Event, {
                seller: o.seller,
                buyer: a.identity,
                orderId: o.id,
                listing: o.listing,
              });
            } catch (e) {
              error = errorMessage(e);
            }
            const asset = intent ? getAsset(intent.asset) : null;
            return (
              <article className="panel" key={o.id}>
                <h3>{o.title}</h3>
                <p className="pill">{o.state}</p>
                {intent && asset ? (
                  <>
                    <p className="payment-amount">
                      {formatUnits(intent.units, asset.decimals)} {asset.symbol}
                      <small>on {asset.network}</small>
                    </p>
                    <label>
                      Exact merchant receiving address
                      <code className="address-display">
                        {intent.recipient}
                      </code>
                    </label>
                    <p>
                      Quote: {intent.source} ·{" "}
                      {new Date(intent.createdAt * 1000).toLocaleString()} ·
                      Expires{" "}
                      {new Date(intent.expiresAt * 1000).toLocaleTimeString()}
                    </p>
                    <label>
                      Payment wallet
                      <select
                        value={selected}
                        onChange={(e) => setSelected(Number(e.target.value))}
                      >
                        {a.wallets.map((w, i) => (
                          <option value={i} key={w.address}>
                            {w.name} · {w.address.slice(0, 12)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="button secondary"
                      onClick={() => a.setWalletModal(true)}
                    >
                      Manage wallets
                    </button>
                    <button
                      className="button"
                      disabled={
                        busy ||
                        !config.paymentsEnabled ||
                        o.state === "submitted"
                      }
                      onClick={() => void settle(o)}
                    >
                      Authorize direct payment
                    </button>
                    <label>
                      Transaction reference
                      <input
                        value={o.receipt || tx}
                        onChange={(e) => setTx(e.target.value)}
                      />
                    </label>
                    <button
                      className="button secondary"
                      disabled={busy || !config.paymentsEnabled}
                      onClick={() => void settle(o, true)}
                    >
                      Verify blockchain confirmation
                    </button>
                    {!config.paymentsEnabled && (
                      <p className="notice">
                        Live checkout is awaiting operator activation. No
                        payment can be initiated here.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="error">{error}</p>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
