import { useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Store,
  Globe2,
  ShieldCheck,
  RefreshCw,
  Plus,
  Download,
  Check,
} from "lucide-react";
import { PageTitle, Empty, ProductGrid } from "./components";
import { useApp, listingKey } from "./state";
import { useLocal } from "../../packages/local";
import { categories, config } from "../../packages/config";
import { relayHealth, publishTemplate, query } from "../../packages/nostr";
import {
  canonical,
  download,
  errorMessage,
  relayUrl,
} from "../../packages/security";
import { emptyFilters, type Filters } from "../../packages/search";
import Orders from "./Orders";
import { rfqSchema } from "../../packages/commerce/schema";
import Messages from "./Messages";
import Reviews from "./Reviews";
export function Saved() {
  const a = useApp();
  const products = a.listings.filter(
    (p) => p.member && a.saved.includes(listingKey(p)),
  );
  return (
    <div className="page">
      <PageTitle
        eyebrow="THE THINGS THAT CAUGHT YOUR EYE"
        title="Keep a little inspiration."
        description="Your saved finds stay on this device."
      />
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <Empty
          title="Something will catch your eye."
          description="Tap a heart on any product to save it here. Unavailable or expired listings stay hidden from discovery."
          icon="heart"
        />
      )}
    </div>
  );
}
export function Compare() {
  const a = useApp();
  const products = a.listings.filter(
    (p) => p.member && a.compare.includes(listingKey(p)),
  );
  return (
    <div className="page">
      <PageTitle
        title="A closer comparison."
        description="Compare merchant-stated details side by side."
      />
      {products.length ? (
        <div className="table-wrap">
          <table className="comparison">
            <thead>
              <tr>
                <th>Details</th>
                {products.map((p) => (
                  <th key={p.id}>
                    <Link to={`/product/${p.seller}/${p.id}`}>{p.title}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "Price",
                "Condition",
                "Brand",
                "Shipping",
                "Country",
                "Payment networks",
                "Returns",
              ].map((row, i) => (
                <tr key={row}>
                  <th>{row}</th>
                  {products.map((p) => (
                    <td key={p.id}>
                      {
                        [
                          "$" + p.price,
                          p.extension.condition,
                          p.extension.brand,
                          "$" + p.extension.shipping,
                          p.extension.country,
                          p.extension.assets.join(", "),
                          p.extension.returns,
                        ][i]
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Find what fits you best."
          description="Choose Compare on up to four products, then see their details together."
        />
      )}
    </div>
  );
}
export function Stores() {
  const a = useApp();
  const { sellerId } = useParams();
  const location = useLocation();
  const collections = location.pathname === "/collections";
  const sellers = [
    ...new Set(a.listings.filter((p) => p.member).map((p) => p.seller)),
  ];
  if (sellerId) {
    const profile = a.profiles[sellerId];
    const products = a.listings.filter(
      (p) => p.member && p.seller === sellerId,
    );
    return (
      <div className="page">
        <section
          className="store-cover"
          style={{ borderColor: profile?.accent }}
        >
          {profile?.banner && <img src={profile.banner} alt="Merchant cover" />}
          <div className="store-intro">
            {profile?.picture ? (
              <img
                className="store-logo"
                src={profile.picture}
                alt={profile.name}
              />
            ) : (
              <span className="store-logo">
                <Store />
              </span>
            )}
            <span className="eyebrow">INDEPENDENT STORE</span>
            <h1>{profile?.name || sellerId.slice(0, 16)}</h1>
            <p>
              {profile?.about ||
                "This merchant has not published a compatible storefront biography."}
            </p>
            <span className="pill">
              {a.memberships[sellerId]
                ? "Membership active"
                : "No current membership verified"}
            </span>
            <p className="muted">
              Merchant-stated location: {profile?.country || "Not supplied"}
            </p>
            <Link className="button" to={"/account/messages?to=" + sellerId}>
              Contact merchant
            </Link>
          </div>
        </section>
        <section className="section">
          <h2>Their collection.</h2>
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <Empty title="This store has no eligible products right now." />
          )}
        </section>
        <section className="panel">
          <h2>Store policies</h2>
          <p className="description">
            {profile?.policies ||
              "Ask the merchant for their shipping, support and return policies."}
          </p>
          <p className="fine">
            A paid subscription is not identity verification. Payment
            confirmation does not prove delivery or merchant legitimacy.
          </p>
        </section>
        <Reviews seller={sellerId} />
      </div>
    );
  }
  return (
    <div className="page">
      <PageTitle
        eyebrow={
          collections
            ? "CURATED BY THE PEOPLE BEHIND THEM"
            : "REAL PEOPLE. INDEPENDENT IDEAS."
        }
        title={
          collections
            ? "Collections with a point of view."
            : "Meet your kind of merchant."
        }
        description="Discover the makers, collectors and independent businesses shaping their own corner of the world."
      />
      {sellers.length ? (
        <div className="store-grid">
          {sellers.map((s) => (
            <Link className="panel" key={s} to={"/store/" + s}>
              <Store size={32} />
              <h2>{a.profiles[s]?.name || s.slice(0, 16)}</h2>
              <p>{a.profiles[s]?.about}</p>
              <span className="pill success">Membership active</span>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="Room for the independently minded."
          description="Our merchant community starts with real people and real products. Your store could be part of the first chapter."
          action="Bring your store"
          to="/sell"
          icon="store"
        />
      )}
    </div>
  );
}
export function Sell() {
  return (
    <div className="page sell-page">
      <section className="sell-hero">
        <span className="eyebrow">YOUR INDEPENDENT CHAPTER</span>
        <h1>
          Your store.
          <br />
          Your customers.
          <br />
          <em>Your revenue.</em>
        </h1>
        <p>
          Build something of your own. Reach curious buyers.
          <br />
          Keep every sale, with zero marketplace sales commission.
        </p>
        <Link className="button" to="/seller/onboarding">
          Start your store
        </Link>
      </section>
      <div className="stats-grid">
        {[
          ["$125", "One annual membership"],
          ["0%", "Platform sales commission"],
          ["Unlimited", "Eligible product listings"],
          ["Yours", "Products, data and media"],
        ].map(([n, label]) => (
          <div className="stat" key={n}>
            <b>{n}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="section">
        <PageTitle
          title="Commerce on your terms."
          description="Your signed listings live on independent relays. Your media stays with your provider. Buyers pay your receiving wallet directly."
        />
        <div className="three-columns">
          {[
            [
              "Own your storefront",
              "Publish a merchant-signed profile, tell your story and organize your products.",
            ],
            [
              "Receive payments directly",
              "Accept supported crypto assets on explicit networks. No custody or commission on ordinary purchases.",
            ],
            [
              "Stay in the conversation",
              "Confirm orders and send fulfilment updates through private encrypted messages.",
            ],
          ].map(([h, p]) => (
            <section className="panel" key={h}>
              <h2>{h}</h2>
              <p>{p}</p>
            </section>
          ))}
        </div>
        <p className="fine">
          Merchants manage applicable taxes, fulfilment, returns, warranties,
          product legality and support. Network and independent hosting fees may
          apply.
        </p>
      </section>
    </div>
  );
}
export function Account() {
  const path = useLocation().pathname;
  const a = useApp();
  const [saved, setSaved] = useLocal<Filters[]>("saved-searches", []),
    [country, setCountry] = useLocal("shipping-country", ""),
    [readOnly, setReadOnly] = useLocal("readonly-pubkey", "");
  return (
    <div className="page">
      <div className="account-nav">
        {[
          ["/account", "Your account"],
          ["/account/orders", "Orders"],
          ["/account/messages", "Messages"],
          ["/account/saved-searches", "Saved searches"],
          ["/account/wallets", "Wallets"],
          ["/account/preferences", "Preferences"],
        ].map(([to, label]) => (
          <Link to={to} key={to}>
            {label}
          </Link>
        ))}
      </div>
      {path.endsWith("/orders") ? (
        <Orders />
      ) : path.endsWith("/messages") ? (
        <Messages />
      ) : path.endsWith("/saved-searches") ? (
        <>
          <PageTitle title="Keep your curiosity going." />
          {saved.length ? (
            saved.map((f, i) => (
              <div className="panel" key={i}>
                <h3>{f.query || f.category || "All independent finds"}</h3>
                <Link
                  className="button secondary"
                  to={"/search?q=" + encodeURIComponent(f.query)}
                >
                  Search again
                </Link>
                <button
                  className="text-button"
                  onClick={() => setSaved(saved.filter((_, j) => j !== i))}
                >
                  Remove saved search
                </button>
              </div>
            ))
          ) : (
            <Empty
              title="Your favorite searches, in one place."
              description="Save a search from the marketplace filter panel to return to it here."
            />
          )}
        </>
      ) : path.endsWith("/wallets") ? (
        <>
          <PageTitle
            title="You hold the keys."
            description="Payment wallets and Nostr signing identities serve different purposes."
          />
          <section className="panel">
            <h2>Signing identity</h2>
            <p className="mono">
              {a.identity || "No signing identity connected"}
            </p>
            <button className="button" onClick={() => a.setWalletModal(true)}>
              Connect or manage wallets
            </button>
            <label>
              Read-only Nostr public key
              <input
                value={readOnly}
                onChange={(e) => setReadOnly(e.target.value)}
                maxLength={64}
              />
            </label>
            <p className="fine">
              Read-only keys cannot sign listings or decrypt messages. Recover
              your identity through your signer provider; AisleZero does not
              hold recovery secrets.
            </p>
          </section>
        </>
      ) : path.endsWith("/preferences") ? (
        <>
          <PageTitle title="A little more you." />
          <section className="panel form-panel">
            <label>
              Preferred shipping country
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </label>
            <label>
              Appearance
              <select
                value={a.theme}
                onChange={(e) => a.setTheme(e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <button
              className="button secondary"
              onClick={() =>
                download(
                  "aislezero-preferences.json",
                  JSON.stringify(
                    { country, theme: a.theme, saved: a.saved },
                    null,
                    2,
                  ),
                )
              }
            >
              Export preferences
            </button>
          </section>
        </>
      ) : (
        <>
          <PageTitle
            eyebrow="YOUR CORNER OF AISLEZERO"
            title="Make yourself at home."
            description="Your preferences and records stay under your control. No traditional account is needed to browse."
          />
          <div className="three-columns">
            {[
              [
                "Your orders",
                "Track your direct merchant purchases.",
                "/account/orders",
              ],
              [
                "Your conversations",
                "Keep in touch with independent merchants.",
                "/account/messages",
              ],
              [
                "Your saved finds",
                "Return to things that caught your eye.",
                "/saved",
              ],
            ].map(([h, p, to]) => (
              <Link className="panel" key={to} to={to}>
                <h2>{h}</h2>
                <p>{p}</p>
              </Link>
            ))}
          </div>
          <section className="panel">
            <h2>Bring your store to AisleZero.</h2>
            <Link className="button" to="/seller/onboarding">
              Become a merchant
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
export function Help() {
  const a = useApp();
  const [newRelay, setNewRelay] = useState(""),
    [health, setHealth] = useState<
      { relay: string; ok: boolean; latency: number }[]
    >([]);
  return (
    <div className="page">
      <PageTitle
        eyebrow="A LITTLE HELP GOES A LONG WAY"
        title="Here for the independent."
        description="Manage discovery connections and understand how your marketplace works."
      />
      <div className="three-columns">
        {[
          [
            "Browse without an account",
            "Products are retrieved from independently operated Nostr relays. Your results depend on which relays respond and what they retain.",
          ],
          [
            "Connect the right identity",
            "Use a NIP-07 extension or NIP-46 remote signer for product ownership and private messaging. Payment wallets are separate.",
          ],
          [
            "Confirm before you pay",
            "Contact the merchant, agree on stock, shipping and returns, then review their signed exact payment request.",
          ],
        ].map(([h, p]) => (
          <section className="panel" key={h}>
            <h2>{h}</h2>
            <p>{p}</p>
          </section>
        ))}
      </div>
      <section className="panel form-panel">
        <h2>Your independent relays.</h2>
        <p>
          Changing relays changes discovery coverage. Relay replication does not
          guarantee permanent availability.
        </p>
        {a.relays.map((r) => (
          <div className="relay-row" key={r}>
            <code>{r}</code>
            <span>
              {health.find((x) => x.relay === r)?.ok
                ? "Connected · " +
                  health.find((x) => x.relay === r)?.latency +
                  " ms"
                : health.some((x) => x.relay === r)
                  ? "Unavailable"
                  : "Not checked"}
            </span>
            <button
              className="text-button"
              onClick={() => a.setRelays(a.relays.filter((x) => x !== r))}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="field-row">
          <label>
            Relay URL
            <input
              value={newRelay}
              onChange={(e) => setNewRelay(e.target.value)}
              placeholder="wss://relay.example"
            />
          </label>
          <button
            className="button secondary"
            onClick={() => {
              try {
                const r = relayUrl(newRelay);
                a.setRelays([...new Set([...a.relays, r])]);
                setNewRelay("");
              } catch (e) {
                a.notify(errorMessage(e));
              }
            }}
          >
            Add relay
          </button>
        </div>
        <div className="toolbar">
          <button
            className="button secondary"
            onClick={() =>
              void Promise.all(a.relays.map(relayHealth)).then(setHealth)
            }
          >
            Check relay health
          </button>
          <button className="button" onClick={() => void a.refresh()}>
            Refresh marketplace
          </button>
        </div>
      </section>
      <section className="panel">
        <h2>When something goes wrong.</h2>
        <p>
          Relay unavailable? Try another independent relay. Media missing?
          Contact the merchant; their hosting provider controls availability. A
          rejected wallet transaction moves no funds. A submitted transaction
          requires independent confirmation.
        </p>
        <p>
          Keep an export of important order records. Clearing browser data can
          remove locally stored preferences and records. Your Nostr signer
          remains the recovery authority for replicated messages.
        </p>
        <Link className="text-link" to="/safety">
          Read the safety guide
        </Link>
      </section>
    </div>
  );
}
export function Rfq() {
  const a = useApp();
  const [requirements, setRequirements] = useState(""),
    [quantity, setQuantity] = useState(1),
    [budget, setBudget] = useState(""),
    [destination, setDestination] = useState(""),
    [deadline, setDeadline] = useState(""),
    [requests, setRequests] = useState<any[]>([]);
  const submit = async () => {
    try {
      if (!requirements.trim() || !destination || !deadline)
        throw new Error(
          "Product requirements, destination and delivery date are required",
        );
      const body = {
        version: 1,
        id: crypto.randomUUID(),
        requirements,
        quantity,
        budget,
        destination,
        deliveryDate: deadline,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 86400,
      };
      await publishTemplate(
        {
          kind: 30410,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["d", body.id],
            ["t", "aislezero-rfq"],
            ["expiration", String(body.expiresAt)],
          ],
          content: canonical(body),
        },
        a.relays,
      );
      a.notify("Signed public sourcing request published");
    } catch (e) {
      a.notify(errorMessage(e));
    }
  };
  const load = async () => {
    const events = await query(
      [{ kinds: [30410], "#t": ["aislezero-rfq"], limit: 100 }],
      a.relays,
    );
    setRequests(
      events.flatMap((e) => {
        try {
          const body = rfqSchema.parse(JSON.parse(e.content));
          return body.expiresAt > Date.now() / 1000
            ? [{ ...body, seller: e.pubkey }]
            : [];
        } catch {
          return [];
        }
      }),
    );
  };
  return (
    <div className="page">
      <PageTitle
        eyebrow="BUILD YOUR NEXT BIG IDEA"
        title="Put your sourcing request out there."
        description="Publish a signed public request. Merchants respond privately, with no brokerage commission."
      />
      <div className="editor-layout">
        <section className="panel">
          <label>
            Product requirements & specifications
            <textarea
              value={requirements}
              maxLength={10000}
              rows={6}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </label>
          <div className="field-row">
            <label>
              Quantity
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value)))
                }
              />
            </label>
            <label>
              Budget range, USD
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
          </div>
          <label>
            Delivery destination
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </label>
          <label>
            Desired delivery date
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          <button
            className="button"
            disabled={!a.identity}
            onClick={() => void submit()}
          >
            Sign & publish sourcing request
          </button>
          {!a.identity && (
            <button
              className="text-button"
              onClick={() => a.setWalletModal(true)}
            >
              Connect your Nostr identity
            </button>
          )}
          <p className="fine">
            Requirements are public. Never include a private home address.
            Requests expire after 30 days.
          </p>
        </section>
        <section>
          <button className="button secondary" onClick={() => void load()}>
            Find live sourcing requests
          </button>
          {requests.map((r) => (
            <article className="panel" key={r.id}>
              <h3>{r.requirements}</h3>
              <p>
                {r.quantity} units · {r.destination}
              </p>
              <p>Budget: {r.budget || "Negotiable"}</p>
              <Link
                className="button secondary"
                to={"/account/messages?to=" + r.seller}
              >
                Send a private quotation
              </Link>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
export function Report() {
  const a = useApp();
  const [params] = useSearchParams();
  const appeal = useLocation().pathname.includes("appeal");
  const [listing, setListing] = useState(params.get("listing") || ""),
    [reason, setReason] = useState("suspected-fraud"),
    [details, setDetails] = useState("");
  const submit = async () => {
    try {
      if (!config.operator)
        throw new Error(
          "The operator reporting identity has not been configured",
        );
      if (!listing || !details.trim())
        throw new Error("A listing reference and explanation are required");
      const { sendMessage } = await import("../../packages/messaging");
      await sendMessage(
        config.operator,
        canonical({
          type: appeal ? "aislezero:appeal" : "aislezero:report",
          version: 1,
          listing,
          reason,
          details,
          createdAt: Date.now(),
        }),
      );
      a.notify("Signed, encrypted report delivered to the operator inbox");
      setDetails("");
    } catch (e) {
      a.notify(errorMessage(e));
    }
  };
  return (
    <div className="page">
      <PageTitle
        eyebrow="KEEP THE MARKETPLACE HUMAN"
        title={
          appeal ? "Ask for another look." : "Something doesn’t look right?"
        }
        description="Reports support platform policy enforcement. AisleZero does not arbitrate buyer–seller commercial disputes."
      />
      <section className="panel form-panel">
        <label>
          Listing or decision reference
          <input value={listing} onChange={(e) => setListing(e.target.value)} />
        </label>
        <label>
          Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {[
              "suspected-fraud",
              "illegal-goods",
              "impersonation",
              "counterfeit",
              "malicious-link",
              "misleading-description",
              "abuse",
              "appeal",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Explanation & evidence references
          <textarea
            value={details}
            maxLength={10000}
            rows={7}
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>
        <button
          className="button"
          disabled={!a.identity}
          onClick={() => void submit()}
        >
          Send encrypted {appeal ? "appeal" : "report"}
        </button>
        {!a.identity && (
          <button
            className="text-button"
            onClick={() => a.setWalletModal(true)}
          >
            Connect signing identity
          </button>
        )}
      </section>
    </div>
  );
}
const legalContent: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  "how-it-works": {
    title: "A closer connection to commerce.",
    intro:
      "Discover independent merchants, agree on terms and pay them directly.",
    sections: [
      [
        "Discover",
        "Browse merchant-signed products retrieved from independent relays. Search coverage depends on available providers; it is not exhaustive.",
      ],
      [
        "Agree",
        "Use private messages to confirm availability, shipping, tax, returns and final pricing. A public listing does not reserve stock.",
      ],
      [
        "Pay directly",
        "Review the signed request, exact receiving address, asset and network. Your wallet broadcasts directly to the merchant; AisleZero verifies confirmation independently.",
      ],
      [
        "Receive",
        "The merchant handles fulfilment and support. Keep private order records, confirm receipt and arrange any return directly.",
      ],
    ],
  },
  safety: {
    title: "A little care. A better experience.",
    intro:
      "Buy thoughtfully, know your merchant and stay in control of your wallet.",
    sections: [
      [
        "Get to know the merchant",
        "Ask questions, review policies and check independent reputation. A paid membership or signed event is not proof of business legitimacy or successful delivery.",
      ],
      [
        "Check every detail",
        "Confirm the asset, network, full receiving address and amount. Avoid unexpected payment links and never disclose a seed phrase.",
      ],
      [
        "Understand settlement",
        "Blockchain payments generally cannot be reversed by the marketplace. A confirmed transfer proves settlement, not shipment. Refunds require merchant cooperation.",
      ],
      [
        "Report abuse",
        "Use the signed reporting form for unlawful goods, fraud, malicious links or impersonation. Local visibility restrictions cannot erase content across independent relays.",
      ],
    ],
  },
  privacy: {
    title: "Your data has a home. With you.",
    intro:
      "The marketplace does not maintain a central product, customer, cart, message or order database.",
    sections: [
      [
        "Public data",
        "Signed Nostr profiles, listings, sourcing requests and membership attestations are public and may be copied by independent relays. Deletion is a request, not guaranteed erasure.",
      ],
      [
        "Private records",
        "Messages are NIP-44 encrypted within NIP-17 envelopes. Preferences, carts, decrypted messages and order records remain in browser storage. Shared-device users should protect their browser profile.",
      ],
      [
        "External providers",
        "Relays, media hosts, RPC services, exchange-rate providers and static hosting can receive IP addresses and request metadata. Their own retention policies apply.",
      ],
      [
        "Operator services",
        "An optional stateless issuer validates subscription transactions and signs entitlements. Configure infrastructure logging to avoid request bodies and minimize retention. No advertising analytics are included.",
      ],
    ],
  },
  terms: {
    title: "Clear terms for direct commerce.",
    intro:
      "These baseline terms require operator identity, jurisdiction and qualified legal review before commercial activation.",
    sections: [
      [
        "Marketplace role",
        "AisleZero provides discovery and communication software. Independent merchants are the sellers and handle fulfilment, applicable taxes, returns, warranties, product legality and support. The platform remains responsible for its own applicable legal obligations.",
      ],
      [
        "Payments",
        "Purchase funds move directly from buyer to merchant. The platform provides no custody, escrow or commercial dispute arbitration. Network fees apply and cryptocurrency value can change.",
      ],
      [
        "Merchant membership",
        "The annual merchant listing subscription is $125 USD equivalent for 365 days from confirmed payment. No automatic debit occurs. Renewal creates a new entitlement; overlapping time is not automatically credited. Platform sales commissions and per-product listing fees are zero.",
      ],
      [
        "Availability and responsibility",
        "Relays and media providers are independent. No guaranteed permanence, inventory reservation, business verification or delivery guarantee is implied. Required regional compliance must be configured before launch.",
      ],
    ],
  },
  policies: {
    title: "A marketplace worth being part of.",
    intro:
      "Independent commerce works best with honest information and clear responsibilities.",
    sections: [
      [
        "Honest listings",
        "Merchants must publish accurate product condition, ownership, quantities, pricing, shipping and return terms. Do not claim false certification, discounts or purchase-linked reviews.",
      ],
      [
        "Eligible goods",
        "Only legitimate physical goods complying with applicable laws and marketplace restrictions may be listed. Regional restrictions may be stricter.",
      ],
      [
        "Enforcement",
        "Signed operator decisions can restrict visibility in AisleZero. Reports require evidence and appeals can request review. Restrictions do not delete independent copies.",
      ],
      [
        "Commercial launch",
        "Identity disclosures, consumer protections, tax obligations, sanctions screening and restricted geography handling require a documented operator compliance process.",
      ],
    ],
  },
  "prohibited-items": {
    title: "Some things have no place here.",
    intro:
      "The baseline marketplace policy prohibits unlawful, stolen and dangerous goods. Regional rules may add restrictions.",
    sections: [
      [
        "Restricted categories",
        "No illegal drugs, stolen goods, counterfeit goods, weapons, exploitative materials or products prohibited by applicable law.",
      ],
      [
        "Safety and compliance",
        "Merchants are responsible for product safety, lawful shipping, age restrictions and required disclosures. Do not list regulated goods without approved compliance procedures.",
      ],
      [
        "Report and appeal",
        "Report suspected violations using the encrypted reporting form. Request review through the moderation appeal route.",
      ],
    ],
  },
};
export function Info() {
  const slug = useLocation().pathname.slice(1);
  const data = legalContent[slug] || legalContent.policies;
  return (
    <div className="page prose-page">
      <PageTitle
        eyebrow="INDEPENDENT, WITH RESPONSIBILITY"
        title={data.title}
        description={data.intro}
      />
      {data.sections.map(([title, text]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
      <div className="toolbar">
        <Link className="button secondary" to="/report-listing">
          Report a concern
        </Link>
        <Link className="text-link" to="/moderation-appeal">
          Request a moderation review
        </Link>
      </div>
    </div>
  );
}
