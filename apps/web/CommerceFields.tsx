import type { Extension } from "../../packages/commerce/schema";
import { assets } from "../../packages/payments/assets";
import { useLocal } from "../../packages/local";
export default function CommerceFields({
  value: v,
  onChange,
}: {
  value: Extension;
  onChange: (e: Extension) => void;
}) {
  const [media] = useLocal<
    { url: string; alt: string; type: "image" | "video" }[]
  >("media-library", []);
  const update = <K extends keyof Extension>(k: K, value: Extension[K]) =>
    onChange({ ...v, [k]: value });
  return (
    <>
      <h2>Product details</h2>
      <div className="field-row">
        <label>
          Condition
          <select
            value={v.condition}
            onChange={(e) =>
              update("condition", e.target.value as Extension["condition"])
            }
          >
            {["new", "like-new", "good", "fair"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Quantity available
          <input
            type="number"
            min="0"
            value={v.quantity}
            onChange={(e) => update("quantity", Number(e.target.value))}
          />
        </label>
      </div>
      <div className="field-row">
        <label>
          Brand
          <input
            value={v.brand}
            onChange={(e) => update("brand", e.target.value)}
          />
        </label>
        <label>
          SKU
          <input
            value={v.sku}
            onChange={(e) => update("sku", e.target.value)}
          />
        </label>
      </div>
      <label>
        Country of origin / dispatch
        <input
          value={v.country}
          onChange={(e) => update("country", e.target.value)}
        />
      </label>
      <label>
        Ships to, separated by commas
        <input
          value={v.shipsTo.join(",")}
          onChange={(e) =>
            update(
              "shipsTo",
              e.target.value.split(",").map((s) => s.trim()),
            )
          }
        />
      </label>
      <div className="field-row">
        <label>
          Shipping charge, USD
          <input
            value={v.shipping}
            onChange={(e) => update("shipping", e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          Applicable seller tax, USD
          <input
            value={v.tax}
            onChange={(e) => update("tax", e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          Dispatch time, days
          <input
            type="number"
            min="0"
            value={v.dispatchDays}
            onChange={(e) => update("dispatchDays", Number(e.target.value))}
          />
        </label>
      </div>
      <label>
        Merchant delivery estimate
        <input
          value={v.delivery}
          onChange={(e) => update("delivery", e.target.value)}
        />
      </label>
      <label>
        Return policy
        <textarea
          rows={3}
          value={v.returns}
          onChange={(e) => update("returns", e.target.value)}
        />
      </label>
      <label>
        Warranty
        <input
          value={v.warranty}
          onChange={(e) => update("warranty", e.target.value)}
        />
      </label>
      <h2>Payment preferences</h2>
      <div className="payment-options">
        {assets.map((a) => (
          <label className="checkbox" key={a.id}>
            <input
              type="checkbox"
              checked={v.assets.includes(a.id)}
              onChange={(e) =>
                update(
                  "assets",
                  e.target.checked
                    ? [...v.assets, a.id]
                    : v.assets.filter((x) => x !== a.id),
                )
              }
            />
            {a.symbol} · {a.network}
          </label>
        ))}
      </div>
      {[...new Set(v.assets.map((x) => x.split(":")[1]))].map((n) => (
        <label key={n}>
          Your receiving address · {n}
          <input
            className="mono"
            value={v.addresses[n] || ""}
            onChange={(e) =>
              update("addresses", { ...v.addresses, [n]: e.target.value })
            }
          />
        </label>
      ))}
      <h2>Your product media</h2>
      {v.media.map((m, i) => (
        <div key={i} className="panel">
          <label>
            Merchant-hosted HTTPS URL
            <input
              value={m.url}
              onChange={(e) =>
                update(
                  "media",
                  v.media.map((x, j) =>
                    i === j ? { ...x, url: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label>
            Alternative text
            <input
              value={m.alt}
              onChange={(e) =>
                update(
                  "media",
                  v.media.map((x, j) =>
                    i === j ? { ...x, alt: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <div className="toolbar">
            <button
              type="button"
              className="text-button"
              onClick={() =>
                update(
                  "media",
                  v.media.filter((_, j) => j !== i),
                )
              }
            >
              Remove media
            </button>
            <button
              type="button"
              className="text-button"
              disabled={i === 0}
              onClick={() => {
                const next = [...v.media];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                update("media", next);
              }}
            >
              Move up
            </button>
          </div>
        </div>
      ))}
      <div className="toolbar">
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            update("media", [...v.media, { url: "", alt: "", type: "image" }])
          }
        >
          Add hosted image
        </button>
        {media.length > 0 && (
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              update(
                "media",
                [
                  ...v.media,
                  ...media.filter((m) => !v.media.some((x) => x.url === m.url)),
                ].slice(0, 12),
              )
            }
          >
            Use media library
          </button>
        )}
      </div>
      <h2>Variations & specifications</h2>
      {v.variants.map((variant, i) => (
        <div className="field-row" key={i}>
          <label>
            Variation name
            <input
              value={variant.name}
              onChange={(e) =>
                update(
                  "variants",
                  v.variants.map((x, j) =>
                    i === j ? { ...x, name: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label>
            Options, separated by commas
            <input
              value={variant.options.join(",")}
              onChange={(e) =>
                update(
                  "variants",
                  v.variants.map((x, j) =>
                    i === j
                      ? {
                          ...x,
                          options: e.target.value
                            .split(",")
                            .map((x) => x.trim()),
                        }
                      : x,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              update(
                "variants",
                v.variants.filter((_, j) => j !== i),
              )
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-button"
        onClick={() =>
          update("variants", [...v.variants, { name: "", options: [] }])
        }
      >
        Add a variation
      </button>
      <label>
        Specifications, one name: value per line
        <textarea
          rows={4}
          value={Object.entries(v.specifications)
            .map(([k, val]) => `${k}: ${val}`)
            .join("\n")}
          onChange={(e) =>
            update(
              "specifications",
              Object.fromEntries(
                e.target.value
                  .split("\n")
                  .map((line) => {
                    const i = line.indexOf(":");
                    return i < 0
                      ? [line, ""]
                      : [line.slice(0, i), line.slice(i + 1).trim()];
                  })
                  .filter(([k]) => k),
              ),
            )
          }
        />
      </label>
      <label>
        Collection
        <input
          value={v.collection}
          onChange={(e) => update("collection", e.target.value)}
        />
      </label>
      <label>
        Customization options
        <textarea
          value={v.customization}
          onChange={(e) => update("customization", e.target.value)}
          rows={2}
        />
      </label>
      <h2>Wholesale</h2>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={v.wholesale}
          onChange={(e) => update("wholesale", e.target.checked)}
        />
        Available for wholesale
      </label>
      {v.wholesale && (
        <>
          <label>
            Minimum order quantity
            <input
              type="number"
              min="1"
              value={v.moq}
              onChange={(e) => update("moq", Number(e.target.value))}
            />
          </label>
          {v.tiers.map((tier, i) => (
            <div className="field-row" key={i}>
              <label>
                From quantity
                <input
                  type="number"
                  min="1"
                  value={tier.quantity}
                  onChange={(e) =>
                    update(
                      "tiers",
                      v.tiers.map((x, j) =>
                        i === j
                          ? { ...x, quantity: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Unit price, USD
                <input
                  value={tier.price}
                  onChange={(e) =>
                    update(
                      "tiers",
                      v.tiers.map((x, j) =>
                        i === j ? { ...x, price: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  update(
                    "tiers",
                    v.tiers.filter((_, j) => i !== j),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-button"
            onClick={() =>
              update("tiers", [...v.tiers, { quantity: 10, price: "0" }])
            }
          >
            Add volume price tier
          </button>
        </>
      )}
    </>
  );
}
