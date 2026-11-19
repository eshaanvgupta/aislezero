import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Heart,
  ShieldCheck,
  Store,
  ShoppingBag,
  Share2,
  PackageOpen,
  Maximize,
  MessageCircle,
} from "lucide-react";
import { useApp, listingKey } from "./state";
import { Empty, Modal, ProductGrid } from "./components";
import { orderSchema } from "../../packages/commerce/schema";
import { sendMessage } from "../../packages/messaging";
import { errorMessage } from "../../packages/security";
export default function Product() {
  const { sellerId, listingId } = useParams();
  const a = useApp();
  const nav = useNavigate();
  const [photo, setPhoto] = useState(0),
    [quantity, setQuantity] = useState(1),
    [variants, setVariants] = useState<Record<string, string>>({}),
    [full, setFull] = useState(false),
    [offer, setOffer] = useState(false),
    [offerPrice, setOfferPrice] = useState("");
  const p = a.listings.find((p) => p.seller === sellerId && p.id === listingId);
  if (!p)
    return (
      <div className="page">
        <Empty
          title="This listing isn't available in your relay catalog."
          description="It may be withdrawn, unavailable from your relays, or still loading. Refresh from the help center to try again."
        />
      </div>
    );
  const media = p.extension.media[photo];
  const key = listingKey(p);
  const seller = a.profiles[p.seller];
  const add = () => {
    if (!p.member) {
      a.notify(
        "This merchant does not have a currently verifiable marketplace membership",
      );
      return;
    }
    for (const v of p.extension.variants)
      if (!variants[v.name]) {
        a.notify("Choose " + v.name);
        return;
      }
    a.setCart((old) => [
      ...old.filter((i) => listingKey(i) !== key),
      { seller: p.seller, id: p.id, quantity, variants },
    ]);
    a.notify("Added to your bag");
  };
  const makeOffer = async () => {
    try {
      if (!a.identity)
        throw new Error("Connect your Nostr identity to send a private offer");
      await sendMessage(
        p.seller,
        JSON.stringify({
          type: "aislezero:offer",
          version: 1,
          id: crypto.randomUUID(),
          listing: `30402:${p.seller}:${p.id}`,
          quantity,
          price: offerPrice,
          currency: "USD",
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
        }),
      );
      a.notify("Private offer sent");
      setOffer(false);
    } catch (e) {
      a.notify(errorMessage(e));
    }
  };
  return (
    <div className="page product-page">
      <div className="breadcrumbs">
        <Link to="/explore">Marketplace</Link>
        <span>/</span>
        <Link to={"/category/" + p.category}>{p.category}</Link>
        <span>/</span>
        <span>{p.title}</span>
      </div>
      <div className="product-layout">
        <div className="gallery">
          <div className="main-photo">
            {media ? (
              media.type === "video" ? (
                <video src={media.url} controls aria-label={media.alt} />
              ) : (
                <img
                  src={media.url}
                  alt={media.alt || p.title}
                  onError={(e) => {
                    e.currentTarget.alt =
                      "Merchant-hosted media is unavailable";
                  }}
                />
              )
            ) : (
              <div className="media-fallback">
                <PackageOpen size={60} />
                <p>No merchant media supplied</p>
              </div>
            )}
            <button
              className="icon-button"
              aria-label="Open fullscreen gallery"
              onClick={() => setFull(true)}
            >
              <Maximize size={19} />
            </button>
          </div>
          <div className="thumbnails">
            {p.extension.media.map((m, i) => (
              <button
                className={photo === i ? "active" : ""}
                onClick={() => setPhoto(i)}
                key={m.url}
                aria-label={"View media " + (i + 1)}
              >
                {m.type === "image" ? (
                  <img src={m.url} alt={m.alt} />
                ) : (
                  <span>Video</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="purchase-panel">
          <span className="eyebrow">
            {p.extension.condition} ·{" "}
            {p.extension.country || "Location not supplied"}
          </span>
          <h1>{p.title}</h1>
          <Link className="seller-line" to={"/store/" + p.seller}>
            <Store size={17} />
            {seller?.name || p.seller.slice(0, 16)}
            {p.member && (
              <span className="pill success">Membership active</span>
            )}
          </Link>
          <div className="detail-price">
            ${p.price}
            <small>USD reference price</small>
          </div>
          <p className="muted">
            Merchant confirmation required. Availability is not reserved by this
            listing.
          </p>
          {p.extension.variants.map((v) => (
            <label key={v.name}>
              {v.name}
              <select
                value={variants[v.name] || ""}
                onChange={(e) =>
                  setVariants({ ...variants, [v.name]: e.target.value })
                }
              >
                <option value="">Choose {v.name}</option>
                {v.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Quantity
            <input
              className="quantity-input"
              type="number"
              min={p.extension.moq}
              max={p.extension.quantity}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(p.extension.moq, Number(e.target.value)))
              }
            />
          </label>
          <div className="cost-lines">
            <span>
              Product subtotal<b>${(Number(p.price) * quantity).toFixed(2)}</b>
            </span>
            <span>
              Merchant shipping<b>${p.extension.shipping}</b>
            </span>
            <span>
              Seller-specified tax<b>${p.extension.tax}</b>
            </span>
            <span>
              Platform sales commission<b>$0.00</b>
            </span>
            <span>
              Network fees<b>Shown by wallet</b>
            </span>
          </div>
          <button
            className="button full"
            onClick={add}
            disabled={!p.member || p.extension.quantity < quantity}
          >
            <ShoppingBag size={17} />
            Add to bag
          </button>
          <button
            className="button secondary full"
            onClick={() => {
              add();
              if (p.member) nav("/checkout");
            }}
            disabled={!p.member}
          >
            Request purchase
          </button>
          <div className="field-row">
            <button className="text-button" onClick={() => setOffer(true)}>
              Make an offer
            </button>
            <Link
              className="text-button"
              to={"/account/messages?to=" + p.seller}
            >
              <MessageCircle size={15} />
              Contact merchant
            </Link>
            <button
              className="icon-button"
              aria-label="Save product"
              onClick={() =>
                a.setSaved((old) =>
                  old.includes(key)
                    ? old.filter((k) => k !== key)
                    : [...old, key],
                )
              }
            >
              <Heart
                size={18}
                fill={a.saved.includes(key) ? "currentColor" : "none"}
              />
            </button>
            <button
              className="icon-button"
              aria-label="Share product"
              onClick={() => {
                void navigator.clipboard.writeText(location.href);
                a.notify("Product link copied");
              }}
            >
              <Share2 size={18} />
            </button>
          </div>
          <p className="fine">
            <ShieldCheck size={16} />
            Pay the merchant directly. Review their terms before authorizing.
          </p>
        </div>
      </div>
      <div className="product-details">
        <section>
          <h2>A closer look.</h2>
          <p className="description">{p.description}</p>
          <h3>Specifications</h3>
          <dl>
            {Object.entries(p.extension.specifications).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2>The details that matter.</h2>
          <details open>
            <summary>Shipping & delivery</summary>
            <p>
              Dispatch estimate: {p.extension.dispatchDays} days.{" "}
              {p.extension.delivery}
            </p>
            <p>
              Ships to: {p.extension.shipsTo.join(", ") || "Ask the merchant"}
            </p>
          </details>
          <details>
            <summary>Returns & warranty</summary>
            <p>{p.extension.returns}</p>
            <p>{p.extension.warranty}</p>
          </details>
          <details>
            <summary>Accepted payments</summary>
            <p>
              {p.extension.assets.map((x) => x.replace(":", " on ")).join(", ")}
            </p>
          </details>
          <p className="fine">
            Subscription payment is not business verification. Delivery
            estimates are merchant statements.
          </p>
          <Link
            to={
              "/report-listing?listing=" +
              encodeURIComponent(`30402:${p.seller}:${p.id}`)
            }
            className="text-link"
          >
            Report this listing
          </Link>
        </section>
      </div>
      <section className="section">
        <h2>More from this merchant.</h2>
        <ProductGrid
          products={a.listings
            .filter((x) => x.member && x.seller === p.seller && x.id !== p.id)
            .slice(0, 4)}
        />
      </section>
      {full && (
        <Modal title={p.title} onClose={() => setFull(false)}>
          <div className="fullscreen-gallery">
            {media?.type === "image" ? (
              <img src={media.url} alt={media.alt} />
            ) : (
              <p>No image selected</p>
            )}
            <div className="field-row">
              <button
                className="button secondary"
                onClick={() =>
                  setPhoto(
                    (photo - 1 + p.extension.media.length) %
                      p.extension.media.length,
                  )
                }
              >
                Previous
              </button>
              <button
                className="button secondary"
                onClick={() => setPhoto((photo + 1) % p.extension.media.length)}
              >
                Next
              </button>
            </div>
          </div>
        </Modal>
      )}
      {offer && (
        <Modal
          title="Make it personal. Make an offer."
          onClose={() => setOffer(false)}
        >
          <label>
            Your proposed total, USD
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
          </label>
          <p className="muted">
            This private offer expires in 24 hours. The merchant must confirm
            shipping, availability and final pricing.
          </p>
          <button
            className="button"
            disabled={Number(offerPrice) <= 0}
            onClick={() => void makeOffer()}
          >
            Send private offer
          </button>
        </Modal>
      )}
    </div>
  );
}
