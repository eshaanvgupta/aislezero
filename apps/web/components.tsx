import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  MessageCircle,
  Sun,
  Moon,
  Menu,
  X,
  Globe2,
  ShieldCheck,
  PackageOpen,
  SlidersHorizontal,
  Home,
  Shirt,
  Headphones,
  Watch,
  Palette,
  Tent,
  Store,
  Wallet,
  Check,
  Layers,
  ExternalLink,
} from "lucide-react";
import { useApp, listingKey } from "./state";
import type { Listing } from "../../packages/commerce/schema";
import { categories } from "../../packages/config";
import {
  evmWallets,
  discoverSolana,
  connectEvm,
  connectSolana,
  connectBitcoin,
} from "../../packages/wallets";
import { errorMessage } from "../../packages/security";
export const icons = {
  home: Home,
  shirt: Shirt,
  headphones: Headphones,
  watch: Watch,
  palette: Palette,
  tent: Tent,
};
export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="AisleZero home">
      <span className="logo-mark">
        <i />
        <i />
      </span>
      Aisle<span>Zero</span>
      <sup>®</sup>
    </Link>
  );
}
export function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="button" {...props}>
      {children}
    </button>
  );
}
export function Header() {
  const a = useApp();
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const [q, setQ] = useState("");
  function search(e: FormEvent) {
    e.preventDefault();
    nav("/search?q=" + encodeURIComponent(q));
    setMenu(false);
  }
  return (
    <>
      <div className="announcement">
        Real products. Direct payments.{" "}
        <span>Zero marketplace commissions.</span>
        <Link to="/how-it-works">A better way to buy</Link>
      </div>
      <header className="header">
        <div className="header-main">
          <Logo />
          <form className="universal-search" onSubmit={search}>
            <Search size={19} />
            <input
              aria-label="Search marketplace"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find something worth discovering"
            />
            <kbd>⌕</kbd>
          </form>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => a.setTheme(a.theme === "light" ? "dark" : "light")}
              aria-label="Toggle color theme"
            >
              {a.theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <Link
              className="icon-button desktop-action"
              to="/saved"
              aria-label="Saved products"
            >
              <Heart size={21} />
            </Link>
            <Link
              className="icon-button desktop-action"
              to="/account/messages"
              aria-label="Messages"
            >
              <MessageCircle size={21} />
            </Link>
            <Link
              className="icon-button"
              to="/cart"
              aria-label={`Cart, ${a.cart.length} items`}
            >
              <ShoppingBag size={21} />
              {a.cart.length > 0 && <b className="badge">{a.cart.length}</b>}
            </Link>
            <button
              className="wallet-button"
              aria-label="Connect or manage wallets"
              onClick={() => a.setWalletModal(true)}
            >
              <Wallet size={17} />
              <span>
                {a.wallets.length ? "Your wallets" : "Connect wallet"}
              </span>
            </button>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <nav
          className={"navigation " + (menu ? "is-open" : "")}
          aria-label="Main navigation"
        >
          <div>
            <NavLink to="/explore">
              <Menu size={16} />
              All categories
            </NavLink>
            <NavLink to="/explore">Explore</NavLink>
            <NavLink to="/collections">Collections</NavLink>
            <NavLink to="/stores">Independent stores</NavLink>
            <NavLink to="/wholesale">Wholesale</NavLink>
          </div>
          <div>
            <span className="nav-caption">
              <Globe2 size={14} />
              Independent. Worldwide.
            </span>
            <NavLink className="sell-link" to="/sell">
              Sell on AisleZero
            </NavLink>
          </div>
        </nav>
      </header>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <Link to="/">
          <Home />
          Home
        </Link>
        <Link to="/explore">
          <Search />
          Explore
        </Link>
        <Link to="/saved">
          <Heart />
          Saved
        </Link>
        <Link to="/account">
          <Store />
          Account
        </Link>
      </nav>
    </>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div>
          <Logo />
          <p>
            A world of independent commerce.
            <br />
            More ownership. More possibility.
          </p>
          <span className="eyebrow">REAL PRODUCTS. DIRECT PAYMENTS.</span>
        </div>
        <div>
          <h3>Discover</h3>
          <Link to="/explore">Marketplace</Link>
          <Link to="/stores">Independent stores</Link>
          <Link to="/wholesale">Wholesale sourcing</Link>
          <Link to="/rfq">Request a quotation</Link>
        </div>
        <div>
          <h3>Make it yours</h3>
          <Link to="/sell">Start selling</Link>
          <Link to="/pricing">Simple pricing</Link>
          <Link to="/seller/dashboard">Merchant dashboard</Link>
          <Link to="/how-it-works">How it works</Link>
        </div>
        <div>
          <h3>Here to help</h3>
          <Link to="/safety">Shopping safely</Link>
          <Link to="/help">Help & relay settings</Link>
          <Link to="/report-listing">Report a listing</Link>
          <Link to="/policies">Marketplace policies</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} AisleZero</span>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/prohibited-items">Prohibited items</Link>
        </div>
        <span>Built for the independent.</span>
      </div>
    </footer>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title = "A good find starts with a real merchant.",
  description = "This collection is waiting for its first eligible listings. Discover another category, or bring your own store to AisleZero.",
  action = "Explore marketplace",
  to = "/explore",
  icon = "package",
}: {
  title?: string;
  description?: string;
  action?: string;
  to?: string;
  icon?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        {icon === "store" ? (
          <Store size={30} />
        ) : icon === "heart" ? (
          <Heart size={30} />
        ) : (
          <PackageOpen size={30} />
        )}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && (
        <Link className="button" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}
export function ProductCard({ p }: { p: Listing }) {
  const a = useApp();
  const key = listingKey(p);
  const saved = a.saved.includes(key);
  return (
    <article className="product-card">
      <Link className="product-image" to={`/product/${p.seller}/${p.id}`}>
        {p.extension.media[0] ? (
          <img
            loading="lazy"
            src={p.extension.media[0].url}
            alt={p.extension.media[0].alt || p.title}
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
        ) : (
          <PackageOpen size={36} />
        )}
        <span className="condition">
          {p.extension.condition.replace("-", " ")}
        </span>
      </Link>
      <button
        className={"save-button " + (saved ? "selected" : "")}
        aria-label={saved ? "Unsave product" : "Save product"}
        onClick={() =>
          a.setSaved((old) =>
            saved ? old.filter((k) => k !== key) : [...old, key],
          )
        }
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
      </button>
      <Link to={`/product/${p.seller}/${p.id}`}>
        <h3>{p.title}</h3>
      </Link>
      <Link className="muted" to={`/store/${p.seller}`}>
        {a.profiles[p.seller]?.name || p.seller.slice(0, 12)}
      </Link>
      <div className="product-price">
        ${p.price}
        <span>
          {Number(p.extension.shipping) === 0
            ? "Merchant offers free shipping"
            : `Shipping $${p.extension.shipping}`}
        </span>
      </div>
      <div className="asset-row">
        {p.extension.assets.map((s) => (
          <span key={s}>{s.split(":")[0]}</span>
        ))}
      </div>
      <button
        className="text-button"
        onClick={() =>
          a.setCompare((old) =>
            old.includes(key)
              ? old.filter((k) => k !== key)
              : [...old.slice(-3), key],
          )
        }
      >
        <Layers size={14} />
        {a.compare.includes(key) ? "Remove comparison" : "Compare"}
      </button>
    </article>
  );
}
export function ProductGrid({ products }: { products: Listing[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={listingKey(p)} p={p} />
      ))}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    const close = () => onClose();
    d.addEventListener("cancel", close);
    return () => {
      d.removeEventListener("cancel", close);
      d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function WalletModal() {
  const a = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [bunker, setBunker] = useState("");
  const sol = discoverSolana();
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Your wallets. Your control."
      onClose={() => a.setWalletModal(false)}
    >
      <p className="muted">
        Choose your payment wallet. Browsing is always open, and connecting
        never authorizes a payment.
      </p>
      <div className="wallet-list">
        {evmWallets.map((w) => (
          <button
            key={w.uuid}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const connected = await connectEvm(w);
                a.setWallets((old) => [
                  ...old.filter((x) => x.address !== connected.address),
                  connected,
                ]);
              })
            }
          >
            <span className="wallet-symbol">E</span>
            <div>
              <b>{w.name}</b>
              <small>Ethereum · BNB Smart Chain</small>
            </div>
          </button>
        ))}
        {sol.map((w) => (
          <button
            key={"sol-" + w.name}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const connected = await connectSolana(w);
                a.setWallets((old) => [
                  ...old.filter((x) => x.address !== connected.address),
                  connected,
                ]);
              })
            }
          >
            <span className="wallet-symbol sol">S</span>
            <div>
              <b>{w.name}</b>
              <small>Solana</small>
            </div>
          </button>
        ))}
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const connected = await connectBitcoin();
              a.setWallets((old) => [
                ...old.filter((x) => x.address !== connected.address),
                connected,
              ]);
            })
          }
        >
          <span className="wallet-symbol btc">₿</span>
          <div>
            <b>UniSat-compatible wallet</b>
            <small>Bitcoin · PSBT signing</small>
          </div>
        </button>
      </div>
      {!evmWallets.length && !sol.length && (
        <p className="notice">
          No Ethereum or Solana browser wallets discovered. Install a compatible
          wallet and refresh this page.
        </p>
      )}
      {a.wallets.map((w) => (
        <div className="connected-wallet" key={w.address}>
          <Check size={16} />
          <span>
            {w.name}
            <small className="mono">{w.address}</small>
          </span>
          <button
            className="text-button"
            onClick={() => a.setWallets(a.wallets.filter((x) => x !== w))}
          >
            Disconnect
          </button>
        </div>
      ))}
      <div className="divider" />
      <h3>Merchant & messaging identity</h3>
      <p className="muted">
        Nostr keeps your products and messages under your signing identity. It
        is separate from your payment wallet.
      </p>
      {a.identity ? (
        <div className="notice">
          <span className="mono">{a.identity}</span>
          <button className="text-button" onClick={a.disconnect}>
            Disconnect identity
          </button>
        </div>
      ) : (
        <>
          <button
            className="button secondary full"
            disabled={busy}
            onClick={() => run(() => a.connect())}
          >
            Connect Nostr extension
          </button>
          <label>
            Remote signer connection
            <input
              value={bunker}
              onChange={(e) => setBunker(e.target.value)}
              placeholder="bunker://…"
            />
          </label>
          <button
            className="text-button"
            disabled={busy || !bunker}
            onClick={() => run(() => a.connect(bunker))}
          >
            Connect remote signer
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="fine">
        <ShieldCheck size={15} /> We never request your seed phrase or private
        keys.
      </p>
    </Modal>
  );
}
