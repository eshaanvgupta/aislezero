import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Plus,
  MessageCircle,
  Image,
  Store,
  Wallet,
  Settings,
  BadgeCheck,
  BarChart3,
  Download,
  Upload,
  Check,
  Copy,
  Pause,
  Trash2,
} from "lucide-react";
import { useApp } from "./state";
import { PageTitle, Empty } from "./components";
import {
  defaultExtension,
  listingInputSchema,
  listingTemplate,
  profileSchema,
  type ListingInput,
  type Profile,
} from "../../packages/commerce/schema";
import {
  canonical,
  download,
  errorMessage,
  safeUrl,
} from "../../packages/security";
import {
  sign,
  publish,
  publishTemplate,
  query,
  getSigner,
} from "../../packages/nostr";
import { config, categories } from "../../packages/config";
import { assets, getAsset } from "../../packages/payments/assets";
import { validateAddress } from "../../packages/payments";
import { useLocal, exportCsv, parseCsv } from "../../packages/local";
import { inspectFile, uploadDirect } from "../../packages/storage";
import Messages from "./Messages";
import Orders from "./Orders";
import Subscription from "./Subscription";
import CommerceFields from "./CommerceFields";
const sellerLinks = [
  ["dashboard", "Overview", LayoutDashboard],
  ["listings", "Products", Package],
  ["orders", "Orders", Package],
  ["messages", "Messages", MessageCircle],
  ["offers", "Offers", BadgeCheck],
  ["rfqs", "Quotations", MessageCircle],
  ["media", "Media library", Image],
  ["storefront", "Your storefront", Store],
  ["analytics", "Analytics", BarChart3],
  ["wallets", "Receiving wallets", Wallet],
  ["subscription", "Membership", BadgeCheck],
  ["settings", "Settings", Settings],
] as const;
export default function Seller() {
  const a = useApp();
  const path = useLocation().pathname;
  const section = path.split("/")[2] || "dashboard";
  return (
    <div className="seller-shell">
      <aside className="seller-sidebar">
        <div className="seller-label">
          <span className="eyebrow">MERCHANT STUDIO</span>
          <h3>{a.profiles[a.identity]?.name || "Your independent store"}</h3>
        </div>
        <nav aria-label="Merchant navigation">
          {sellerLinks.map(([slug, label, Icon]) => (
            <NavLink key={slug} to={"/seller/" + slug}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link className="button" to="/seller/listings/new">
          <Plus size={16} />
          New product
        </Link>
      </aside>
      <div className="seller-content">
        {!a.identity && (
          <div className="notice identity-notice">
            <span>
              Connect your Nostr signing identity to own and publish your store.
            </span>
            <button
              className="button secondary"
              onClick={() => a.setWalletModal(true)}
            >
              Connect identity
            </button>
          </div>
        )}
        {section === "dashboard" || section === "analytics" ? (
          <Dashboard analytics={section === "analytics"} />
        ) : section === "onboarding" ? (
          <Onboarding />
        ) : section === "listings" ? (
          path.includes("/new") || path.includes("/edit") ? (
            <ListingEditor />
          ) : (
            <ListingManager />
          )
        ) : section === "media" ? (
          <MediaManager />
        ) : section === "storefront" ? (
          <StorefrontEditor />
        ) : section === "wallets" ? (
          <ReceivingWallets />
        ) : section === "subscription" ? (
          <Subscription />
        ) : section === "messages" ||
          section === "offers" ||
          section === "rfqs" ? (
          <Messages mode={section} />
        ) : section === "orders" ? (
          <Orders seller />
        ) : (
          <SellerSettings />
        )}
      </div>
    </div>
  );
}
function Dashboard({ analytics = false }: { analytics?: boolean }) {
  const a = useApp();
  const own = a.merchantListings,
    orders = a.orders.filter((o) => o.seller === a.identity),
    verified = orders.filter((o) =>
      ["verified", "preparing", "shipped", "delivered", "received"].includes(
        o.state,
      ),
    );
  const member = a.memberships[a.identity];
  return (
    <>
      <PageTitle
        eyebrow="YOUR INDEPENDENT BUSINESS"
        title={
          analytics
            ? "Your store, by the numbers."
            : "Make something of your own."
        }
        description="A clear view of the records available on this device."
      >
        <Link className="button" to="/seller/listings/new">
          <Plus size={16} />
          Add a product
        </Link>
      </PageTitle>
      <div className="stats-grid">
        {[
          ["Published products", own.length],
          ["Verified orders", verified.length],
          [
            "Awaiting confirmation",
            orders.filter((o) => o.state === "requested").length,
          ],
          ["Low stock", own.filter((p) => p.extension.quantity < 5).length],
        ].map(([name, n]) => (
          <div className="stat" key={name}>
            <span>{name}</span>
            <b>{n}</b>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <span className="eyebrow">MERCHANT MEMBERSHIP</span>
          <h2>
            {member
              ? "Your independence is active."
              : "Your next chapter starts here."}
          </h2>
          <p>
            {member
              ? "Valid until " +
                new Date(member.expiresAt * 1000).toLocaleDateString()
              : "$125 per year. Unlimited eligible listings. Zero sales commission."}
          </p>
          <Link className="button" to="/seller/subscription">
            {member ? "Manage membership" : "Set up your membership"}
          </Link>
        </section>
        <section className="panel">
          <h2>A few things to get you going.</h2>
          {[
            ["Connect your identity", !!a.identity, "/account/wallets"],
            [
              "Publish your store profile",
              !!a.profiles[a.identity],
              "/seller/storefront",
            ],
            [
              "Configure receiving addresses",
              !!Object.keys(a.profiles[a.identity]?.addresses || {}).length,
              "/seller/wallets",
            ],
            ["Activate membership", !!member, "/seller/subscription"],
          ].map(([label, done, to]) => (
            <Link
              className="checklist-item"
              key={String(label)}
              to={String(to)}
            >
              <span className={done ? "done" : ""}>
                <Check size={15} />
              </span>
              {label}
            </Link>
          ))}
        </section>
      </div>
      <section className="panel">
        <h2>Recent orders</h2>
        {orders.length ? (
          <Orders seller compact />
        ) : (
          <Empty
            title="The first order is a special one."
            description="Confirmed buyer requests will appear here after you retrieve your private inbox."
            action="Open private inbox"
            to="/seller/messages"
          />
        )}
      </section>
      <p className="fine">
        Analytics are derived from locally available, verified records. They may
        be incomplete across devices. No central customer or order database is
        maintained.
      </p>
    </>
  );
}
function Onboarding() {
  const a = useApp();
  const steps = [
    [
      "Connect your identity",
      "Your Nostr signer owns your storefront. Never enter a private key.",
      "/account/wallets",
    ],
    [
      "Tell your story",
      "Choose a name, biography, location and store policies.",
      "/seller/storefront",
    ],
    [
      "Set up direct receiving wallets",
      "Add and validate addresses for each supported network.",
      "/seller/wallets",
    ],
    [
      "Bring your own media hosting",
      "Choose IPFS pinning, Arweave-compatible upload or your HTTPS provider.",
      "/seller/media",
    ],
    [
      "Review merchant responsibilities",
      "You manage fulfilment, taxes, returns, product legality and customer support.",
      "/terms",
    ],
    [
      "Activate your annual membership",
      "$125 USD equivalent, independently verified before active publication.",
      "/seller/subscription",
    ],
    [
      "Publish your first good find",
      "Create a signed product listing and replicate it to independent relays.",
      "/seller/listings/new",
    ],
  ];
  return (
    <>
      <PageTitle
        eyebrow="OPEN YOUR OWN CHAPTER"
        title="Your store starts with you."
        description="Keep your products, your customers and your revenue under your control."
      />
      <div className="onboarding-list">
        {steps.map(([title, body, to], i) => (
          <div className="panel onboarding-step" key={title}>
            <span className="step-number">{i + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
            <Link className="button secondary" to={to}>
              Continue
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
function ListingManager() {
  const a = useApp();
  const own = a.merchantListings;
  const [busy, setBusy] = useState(false);
  const update = async (p: (typeof own)[number], status: string) => {
    setBusy(true);
    try {
      const t = listingTemplate(p);
      t.tags = t.tags.map((tag) =>
        tag[0] === "status" ? ["status", status] : tag,
      );
      if (status === "inactive") t.kind = 30403;
      await publishTemplate(t, a.relays);
      if (status === "inactive")
        await publishTemplate(
          {
            kind: 5,
            created_at: Math.floor(Date.now() / 1000),
            content: "Merchant paused listing",
            tags: [["a", `30402:${p.seller}:${p.id}`]],
          },
          a.relays,
        );
      a.notify("Merchant-signed update acknowledged");
      await a.refresh();
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const csvImport = async (file: File) => {
    try {
      const rows = parseCsv(await file.text());
      for (const row of rows) {
        const input = listingInputSchema.parse({
          ...row,
          extension: JSON.parse(row.extension || "{}"),
        });
        localStorage.setItem("az:draft:" + input.id, JSON.stringify(input));
      }
      a.notify(
        `${rows.length} validated drafts imported. Review and sign each before publication.`,
      );
    } catch (e) {
      a.notify(errorMessage(e));
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="YOUR PRODUCTS, YOUR DATA"
        title="The things you bring."
        description="Changes become public only after your signer authorizes them and a relay acknowledges them."
      >
        <Link className="button" to="/seller/listings/new">
          <Plus size={16} />
          New product
        </Link>
      </PageTitle>
      <div className="toolbar">
        <button
          className="button secondary"
          onClick={() =>
            download(
              "aislezero-products.csv",
              exportCsv(
                own.map((p) => ({
                  id: p.id,
                  title: p.title,
                  description: p.description,
                  category: p.category,
                  price: p.price,
                  currency: p.currency,
                  extension: JSON.stringify(p.extension),
                })),
              ),
              "text/csv",
            )
          }
        >
          <Download size={16} />
          Export CSV
        </button>
        <label className="button secondary file-label">
          <Upload size={16} />
          Import CSV
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files?.[0]) void csvImport(e.target.files[0]);
            }}
          />
        </label>
      </div>
      {own.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {own.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.title}</b>
                    <small>{p.id}</small>
                  </td>
                  <td>${p.price}</td>
                  <td>{p.extension.quantity}</td>
                  <td>{p.status}</td>
                  <td>
                    <Link
                      className="text-button"
                      to={"/seller/listings/" + p.id + "/edit"}
                    >
                      Edit
                    </Link>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void update(p, "sold")}
                    >
                      Mark sold
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void update(p, "inactive")}
                    >
                      Pause
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        const copy = {
                          ...p,
                          id: crypto.randomUUID(),
                          title: p.title + " (copy)",
                        };
                        localStorage.setItem(
                          "az:draft:" + copy.id,
                          JSON.stringify(copy),
                        );
                        location.assign(
                          import.meta.env.BASE_URL +
                            "seller/listings/" +
                            copy.id +
                            "/edit",
                        );
                      }}
                    >
                      Duplicate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Your collection starts with one good thing."
          description="Draft locally, preview your product, and publish it with your signing identity when your membership is active."
          action="Create your first product"
          to="/seller/listings/new"
        />
      )}
      <div className="panel">
        <h3>Continue a local draft</h3>
        <div className="link-list">
          {Object.keys(localStorage)
            .filter((k) => k.startsWith("az:draft:"))
            .map((k) => (
              <Link key={k} to={"/seller/listings/" + k.slice(9) + "/edit"}>
                {JSON.parse(localStorage.getItem(k) || "{}").title ||
                  k.slice(9)}
              </Link>
            ))}
        </div>
      </div>
    </>
  );
}
function ListingEditor() {
  const a = useApp();
  const { id } = useParams();
  const nav = useNavigate();
  const [draftId] = useState(id || crypto.randomUUID());
  const [draft, setDraft] = useState<ListingInput>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("az:draft:" + draftId) || "null") ||
        a.merchantListings.find((p) => p.id === id) || {
          id: draftId,
          title: "",
          description: "",
          category: "home-living",
          price: "",
          currency: "USD",
          extension: {
            ...defaultExtension,
            addresses: a.profiles[a.identity]?.addresses || {},
          },
        }
      );
    } catch {
      return {
        id: draftId,
        title: "",
        description: "",
        category: "home-living",
        price: "",
        currency: "USD",
        extension: defaultExtension,
      };
    }
  });
  const [extra, setExtra] = useState(JSON.stringify(draft.extension, null, 2)),
    [busy, setBusy] = useState(false),
    [replication, setReplication] = useState("");
  useEffect(() => {
    localStorage.setItem("az:draft:" + draftId, JSON.stringify(draft));
  }, [draft, draftId]);
  const submit = async (active: boolean) => {
    setBusy(true);
    try {
      if (!a.identity) throw new Error("Connect a signing identity");
      if (active && !a.memberships[a.identity])
        throw new Error(
          "A currently valid paid membership is required for active marketplace publication",
        );
      const input = listingInputSchema.parse({
        ...draft,
        extension: JSON.parse(extra),
      });
      for (const assetId of input.extension.assets)
        validateAddress(
          input.extension.addresses[getAsset(assetId).network] || "",
          getAsset(assetId),
        );
      const result = await publishTemplate(
        listingTemplate(input, active),
        a.relays,
      );
      setReplication(
        result.replication
          .map((r) => `${r.relay}: ${r.ok ? "acknowledged" : "not replicated"}`)
          .join("\n"),
      );
      localStorage.setItem("az:draft:" + draftId, JSON.stringify(input));
      await a.refresh();
      a.notify(
        active
          ? "Product published with independent relay acknowledgement"
          : "Inactive signed listing saved to your relays",
      );
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="MAKE A GOOD FIRST IMPRESSION"
        title={id ? "Refine your listing." : "Bring something good."}
        description="Drafts save on this device. Product descriptions are rendered as safe plain text."
      />
      <div className="editor-layout">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(true);
          }}
        >
          <label>
            Product title
            <input
              value={draft.title}
              required
              minLength={3}
              maxLength={160}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label>
              Reference price, USD
              <input
                value={draft.price}
                required
                inputMode="decimal"
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              >
                {categories.map((c) => (
                  <option value={c.slug} key={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Product description
            <textarea
              rows={8}
              minLength={10}
              maxLength={20000}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <CommerceFields
            value={draft.extension}
            onChange={(extension) => {
              setDraft({ ...draft, extension });
              setExtra(JSON.stringify(extension, null, 2));
            }}
          />
          <details>
            <summary>Advanced signed commerce data</summary>
            <label>
              Commerce details, version 1 JSON
              <textarea
                className="mono"
                rows={20}
                value={extra}
                onChange={(e) => {
                  setExtra(e.target.value);
                  try {
                    setDraft({
                      ...draft,
                      extension: JSON.parse(e.target.value),
                    });
                  } catch {
                    /* Retain incomplete editing buffer */
                  }
                }}
              />
            </label>
            <p className="fine">
              Advanced fields must follow the documented versioned schema. Media
              URLs must point to your hosting.
            </p>
          </details>
          <div className="toolbar">
            <button className="button" disabled={busy} type="submit">
              Sign & publish active listing
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void submit(false)}
            >
              Publish inactive draft
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                download(draftId + ".json", JSON.stringify(draft, null, 2))
              }
            >
              Export draft
            </button>
          </div>
          {replication && <pre className="notice">{replication}</pre>}
        </form>
        <aside className="panel listing-preview">
          <span className="eyebrow">LOCAL PREVIEW</span>
          {draft.extension.media[0] && (
            <img
              src={draft.extension.media[0].url}
              alt={draft.extension.media[0].alt}
            />
          )}
          <h2>{draft.title || "Your product title"}</h2>
          <p className="detail-price">${draft.price || "0.00"}</p>
          <p className="description">
            {draft.description || "Your story, in your own words."}
          </p>
          <p className="fine">
            A relay acknowledgement confirms replication, not permanent
            availability. Deletion cannot guarantee erasure from every
            independent client.
          </p>
        </aside>
      </div>
    </>
  );
}
export function StorefrontEditor() {
  const a = useApp();
  const [profile, setProfile] = useLocal<Profile>("profile-draft", {
    name: "",
    about: "",
    country: "",
    shipsTo: [],
    accent: "#4056f4",
    policies: "",
    addresses: {},
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const p = profileSchema.parse({
        ...profile,
        addresses: a.profiles[a.identity]?.addresses || profile.addresses,
      });
      if (p.picture) safeUrl(p.picture);
      if (p.banner) safeUrl(p.banner);
      await publishTemplate(
        {
          kind: 0,
          created_at: Math.floor(Date.now() / 1000),
          content: canonical(p),
          tags: [],
        },
        a.relays,
      );
      await a.refresh();
      a.notify("Signed storefront profile published");
    } catch (e) {
      a.notify(errorMessage(e));
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="LET YOUR STORE FEEL LIKE YOU"
        title="Tell your story."
        description="Your public profile is signed by you and replicated to independent Nostr relays."
      />
      <form className="panel form-panel" onSubmit={submit}>
        {(["name", "country", "picture", "banner", "accent"] as const).map(
          (k) => (
            <label key={k}>
              {k === "name"
                ? "Store name"
                : k === "picture"
                  ? "Logo HTTPS URL"
                  : k === "banner"
                    ? "Cover HTTPS URL"
                    : k === "accent"
                      ? "Accent color"
                      : "Merchant-stated country"}
              <input
                required={k === "name"}
                value={profile[k] || ""}
                onChange={(e) =>
                  setProfile({ ...profile, [k]: e.target.value })
                }
              />
            </label>
          ),
        )}
        <label>
          Store biography
          <textarea
            rows={6}
            value={profile.about}
            onChange={(e) => setProfile({ ...profile, about: e.target.value })}
          />
        </label>
        <label>
          Shipping destinations, comma-separated
          <input
            value={profile.shipsTo.join(", ")}
            onChange={(e) =>
              setProfile({
                ...profile,
                shipsTo: e.target.value.split(",").map((x) => x.trim()),
              })
            }
          />
        </label>
        <label>
          Business policies & contact methods
          <textarea
            rows={6}
            value={profile.policies}
            onChange={(e) =>
              setProfile({ ...profile, policies: e.target.value })
            }
          />
        </label>
        <button className="button" disabled={!a.identity}>
          Sign & publish storefront
        </button>
      </form>
    </>
  );
}
function ReceivingWallets() {
  const a = useApp();
  const [addresses, setAddresses] = useLocal<Record<string, string>>(
    "receiving-wallets",
    {},
  );
  const [proofs, setProofs] = useLocal<Record<string, string>>(
    "wallet-proofs",
    {},
  );
  const save = async () => {
    try {
      for (const [network, addr] of Object.entries(addresses)) {
        if (addr)
          validateAddress(
            addr,
            assets.find((x) => x.network === network)!,
          );
      }
      const p = profileSchema.parse({ ...a.profiles[a.identity], addresses });
      await publishTemplate(
        {
          kind: 0,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: canonical(p),
        },
        a.relays,
      );
      a.notify("Receiving addresses signed and published");
      await a.refresh();
    } catch (e) {
      a.notify(errorMessage(e));
    }
  };
  const prove = async (network: string) => {
    try {
      const w = a.wallets.find(
        (w) =>
          w.network === "evm" &&
          w.address.toLowerCase() === addresses[network]?.toLowerCase(),
      );
      if (!w?.provider)
        throw new Error("Connect the exact receiving EVM wallet first");
      const challenge = `AisleZero wallet link\nNostr: ${a.identity}\nNetwork: ${network}\nAddress: ${w.address}\nNonce: ${crypto.randomUUID()}\nIssued: ${new Date().toISOString()}`;
      const { stringToHex, recoverMessageAddress } = await import("viem");
      const sig = (await w.provider.request({
        method: "personal_sign",
        params: [stringToHex(challenge), w.address as `0x${string}`],
      })) as `0x${string}`;
      if (
        (
          await recoverMessageAddress({ message: challenge, signature: sig })
        ).toLowerCase() !== w.address.toLowerCase()
      )
        throw new Error("Address control signature failed");
      setProofs({
        ...proofs,
        [network]: JSON.stringify({ challenge, signature: sig }),
      });
      a.notify(
        "Address control proven locally; export the proof for independent verification",
      );
    } catch (e) {
      a.notify(errorMessage(e));
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="STRAIGHT TO YOUR WALLET"
        title="Set your receiving addresses."
        description="Purchase payments go directly here. You remain responsible for every address you publish."
      />
      <div className="panel form-panel">
        {["ethereum", "bnb", "solana", "bitcoin"].map((n) => (
          <div key={n}>
            <label>
              {n === "bnb" ? "BNB Smart Chain" : n}
              <input
                className="mono"
                value={addresses[n] || ""}
                onChange={(e) =>
                  setAddresses({ ...addresses, [n]: e.target.value })
                }
              />
            </label>
            {["ethereum", "bnb"].includes(n) ? (
              <button
                className="text-button"
                disabled={!a.identity}
                onClick={() => void prove(n)}
              >
                {proofs[n]
                  ? "Refresh address-control proof"
                  : "Prove address control"}
              </button>
            ) : (
              <p className="fine">
                Address is merchant-stated. This adapter does not issue a public
                address-control attestation.
              </p>
            )}
          </div>
        ))}
        <div className="toolbar">
          <button
            className="button"
            disabled={!a.identity}
            onClick={() => void save()}
          >
            Sign & publish addresses
          </button>
          <button
            className="button secondary"
            onClick={() =>
              download(
                "wallet-link-proofs.json",
                JSON.stringify(proofs, null, 2),
              )
            }
          >
            Export proofs
          </button>
        </div>
      </div>
    </>
  );
}
export function MediaManager() {
  const a = useApp();
  const [provider, setProvider] = useLocal<"pinata" | "https" | "arweave">(
      "media-provider",
      "pinata",
    ),
    [endpoint, setEndpoint] = useLocal("media-endpoint", ""),
    [token, setToken] = useState(""),
    [url, setUrl] = useState(""),
    [alt, setAlt] = useState(""),
    [media, setMedia] = useLocal<
      { url: string; alt: string; hash?: string; type: string }[]
    >("media-library", []),
    [progress, setProgress] = useState(0),
    [busy, setBusy] = useState(false),
    [controller, setController] = useState<AbortController>();
  const upload = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    const c = new AbortController();
    setController(c);
    try {
      for (const file of Array.from(files)) {
        const info = await inspectFile(file);
        const uploaded = await uploadDirect(
          file,
          provider,
          endpoint,
          token,
          setProgress,
          c.signal,
        );
        setMedia((old) => [
          ...old,
          {
            url: uploaded,
            alt: file.name,
            hash: info.hash,
            type: file.type.startsWith("video") ? "video" : "image",
          },
        ]);
      }
      a.notify("Uploaded directly from your browser to your provider");
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="YOUR MEDIA, YOUR HOSTING"
        title="Give your products their best light."
        description="AisleZero never receives or hosts your product files. Provider credentials remain in this tab's memory."
      />
      <div className="editor-layout">
        <section className="panel">
          <label>
            Your provider
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as typeof provider)}
            >
              <option value="pinata">IPFS · Your Pinata account</option>
              <option value="https">Your HTTPS upload endpoint</option>
              <option value="arweave">
                Your Arweave-funded upload endpoint
              </option>
            </select>
          </label>
          {provider !== "pinata" && (
            <label>
              Browser-compatible upload endpoint
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://your-host/upload"
              />
            </label>
          )}
          <label>
            Provider bearer token, this tab only
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          <div
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files);
            }}
          >
            <Upload size={30} />
            <h3>Drop your media here.</h3>
            <p>JPEG, PNG, WebP or MP4 · Up to 50 MB</p>
            <label className="button secondary file-label">
              Choose files
              <input
                disabled={busy}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4"
                onChange={(e) => void upload(e.target.files)}
              />
            </label>
          </div>
          {busy && (
            <>
              <progress value={progress} max={100} />
              <button
                className="text-button"
                onClick={() => controller?.abort()}
              >
                Cancel upload
              </button>
            </>
          )}
          <p className="fine">
            Original files are uploaded unchanged. IPFS requires continuing
            pinning. Arweave uploads require a merchant-funded provider that
            returns an HTTPS URL and permits browser CORS.
          </p>
        </section>
        <section className="panel">
          <h2>Already hosted?</h2>
          <label>
            Public HTTPS media URL
            <input value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label>
            Alternative text
            <input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </label>
          <button
            className="button"
            onClick={() => {
              try {
                setMedia([...media, { url: safeUrl(url), alt, type: "image" }]);
                setUrl("");
                setAlt("");
              } catch (e) {
                a.notify(errorMessage(e));
              }
            }}
          >
            Add hosted media
          </button>
          <p className="fine">
            For IPFS or Arweave references, use your chosen HTTPS gateway.
            Independent hosting availability is outside AisleZero's control.
          </p>
        </section>
      </div>
      <div className="media-grid">
        {media.map((m, i) => (
          <article className="panel" key={m.url + i}>
            {m.type === "video" ? (
              <video src={m.url} controls />
            ) : (
              <img src={m.url} alt={m.alt} />
            )}
            <label>
              Alternative text
              <input
                value={m.alt}
                onChange={(e) =>
                  setMedia(
                    media.map((x, j) =>
                      i === j ? { ...x, alt: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <code>{m.url}</code>
            <div className="toolbar">
              <button
                className="text-button"
                onClick={() => {
                  void navigator.clipboard.writeText(JSON.stringify(m));
                  a.notify("Media reference copied for your listing");
                }}
              >
                Copy reference
              </button>
              <button
                className="text-button"
                disabled={i === 0}
                onClick={() => {
                  const next = [...media];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  setMedia(next);
                }}
              >
                Move up
              </button>
              <button
                className="text-button"
                onClick={() => setMedia(media.filter((_, j) => j !== i))}
              >
                Remove reference
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="fine">
        Removing a reference does not delete provider storage. Delete or unpin
        files using your provider's own controls.
      </p>
    </>
  );
}
function SellerSettings() {
  const a = useApp();
  return (
    <>
      <PageTitle
        title="The way you work."
        description="Your identity and data stay yours."
      />
      <section className="panel">
        <h2>Local records</h2>
        <p>
          Export non-secret preferences and order records. The export may
          contain private commercial information; store it securely.
        </p>
        <button
          className="button secondary"
          onClick={() =>
            download(
              "aislezero-local-export.json",
              JSON.stringify(
                {
                  version: 1,
                  orders: a.orders,
                  saved: a.saved,
                  relays: a.relays,
                },
                null,
                2,
              ),
            )
          }
        >
          Export local records
        </button>
      </section>
      <section className="panel">
        <h2>Relay preferences</h2>
        <p>
          Your products are replicated to the independent relays configured in
          the help center.
        </p>
        <Link className="button secondary" to="/help">
          Manage relays
        </Link>
      </section>
    </>
  );
}
