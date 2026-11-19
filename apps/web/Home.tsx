import { Link } from "react-router-dom";
import {
  Globe2,
  ShieldCheck,
  Sparkles,
  Store,
  Fingerprint,
  Wallet,
  Package,
  Check,
  CircleHelp,
} from "lucide-react";
import { categories } from "../../packages/config";
import { useApp } from "./state";
import { ProductGrid, Empty, icons } from "./components";
export default function HomePage() {
  const a = useApp();
  const products = a.listings.filter((p) => p.member);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span />
            THE INDEPENDENT MARKETPLACE
          </div>
          <h1>
            Good finds.
            <br />
            Great independence<span>.</span>
          </h1>
          <p>
            Discover more from independent merchants.
            <br />
            Pay them directly. Keep commerce human.
          </p>
          <div className="hero-buttons">
            <Link className="button" to="/explore">
              Explore the marketplace
            </Link>
            <Link className="button ghost" to="/sell">
              Bring your store
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <Globe2 size={16} />
              Open to discovery
            </span>
            <i />
            <span>
              <ShieldCheck size={16} />
              You stay in control
            </span>
          </div>
        </div>
        <div
          className="hero-art"
          role="img"
          aria-label="Original abstract composition: cobalt arch, sculptural spheres and a striped pedestal"
        >
          <div className="art-label">
            A DIFFERENT KIND
            <br />
            OF MARKETPLACE.
          </div>
          <div className="sculpture-arch" />
          <div className="sculpture-sphere sphere-one" />
          <div className="sculpture-sphere sphere-two" />
          <div className="sculpture-pedestal" />
          <div className="art-stamp">
            <Sparkles size={17} />
            <span>
              Made for
              <br />
              <strong>the independent.</strong>
            </span>
          </div>
          <span className="art-footnote">
            MORE OWNERSHIP. MORE POSSIBILITY.
          </span>
        </div>
      </section>
      <div className="benefit-strip">
        <div>
          <Wallet />
          <span>
            <b>Pay the merchant directly</b>
            <small>Your purchase, your connection.</small>
          </span>
        </div>
        <div>
          <Store />
          <span>
            <b>Independent by design</b>
            <small>Real people behind every store.</small>
          </span>
        </div>
        <div>
          <Fingerprint />
          <span>
            <b>Owned by the merchant</b>
            <small>Their products. Their data.</small>
          </span>
        </div>
        <div>
          <span className="zero-icon">0%</span>
          <span>
            <b>Zero sales commission</b>
            <small>More stays with the maker.</small>
          </span>
        </div>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
            <h2>A world of good finds.</h2>
          </div>
          <Link className="text-link" to="/explore">
            Explore all categories
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((c, i) => {
            const Icon = icons[c.icon as keyof typeof icons];
            return (
              <Link
                className={"category-tile tile-" + i}
                to={"/category/" + c.slug}
                key={c.slug}
              >
                <div className="category-art">
                  <Icon strokeWidth={1.1} />
                  <span className="category-orbit" />
                </div>
                <h3>{c.name}</h3>
                <span>{c.detail}</span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="section discoveries">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FRESH PERSPECTIVES</span>
            <h2>Recently discovered.</h2>
          </div>
          <Link className="text-link" to="/explore">
            See what's new
          </Link>
        </div>
        {products.length ? (
          <ProductGrid products={products.slice(0, 8)} />
        ) : (
          <div className="founding-empty">
            <div className="empty-illustration">
              <Store size={62} strokeWidth={1} />
              <span>
                <Sparkles size={20} />
              </span>
            </div>
            <div>
              <span className="eyebrow">ROOM FOR SOMETHING ORIGINAL</span>
              <h3>The next great find could be yours.</h3>
              <p>
                Our shelves begin with independent merchants, not sample
                products.
                <br />
                Be part of the first chapter of AisleZero.
              </p>
              <Link className="text-link" to="/sell">
                Become a founding merchant
              </Link>
            </div>
            <Link className="button secondary" to="/seller/onboarding">
              Open your store
            </Link>
          </div>
        )}
        <div className="catalog-note">
          <span className={a.loading ? "status-dot loading" : "status-dot"} />
          {a.loading
            ? "Checking independent relays…"
            : `${products.length} eligible listings from your configured relays`}
          . <Link to="/help">About discovery coverage</Link>
        </div>
      </section>
      <section className="editorial-grid">
        <Link to="/collections" className="editorial-card editorial-light">
          <div>
            <span className="eyebrow">A LITTLE MORE PERSONAL</span>
            <h2>
              Objects with stories.
              <br />
              Stores with soul.
            </h2>
            <p>
              Find the people and perspectives
              <br />
              behind the things you love.
            </p>
            <span className="text-link">Meet independent stores</span>
          </div>
          <div className="editorial-drawing">
            <div className="vase vase-a" />
            <div className="vase vase-b" />
            <div className="vase-branch" />
          </div>
        </Link>
        <Link to="/wholesale" className="editorial-card editorial-blue">
          <div>
            <span className="eyebrow">THINK BIG. SOURCE DIRECT.</span>
            <h2>
              Your next big idea
              <br />
              starts here.
            </h2>
            <p>
              Connect with suppliers. Request a quote.
              <br />
              Build something on your own terms.
            </p>
            <span className="text-link">Explore wholesale</span>
          </div>
          <div className="box-art">
            <i />
            <i />
            <i />
          </div>
        </Link>
      </section>
      <section className="section how-section">
        <div>
          <span className="eyebrow">A SIMPLER CONNECTION</span>
          <h2>
            From their store.
            <br />
            Straight to you.
          </h2>
          <p>
            All the discovery you love.
            <br />A more direct way to shop.
          </p>
          <Link to="/how-it-works" className="text-link">
            Get to know AisleZero
          </Link>
        </div>
        <div className="how-steps">
          <div>
            <span>
              <SearchIcon />
            </span>
            <h3>Find your kind of thing.</h3>
            <p>Explore real listings published by independent merchants.</p>
          </div>
          <div>
            <span>
              <MessageIcon />
            </span>
            <h3>Connect with the person behind it.</h3>
            <p>
              Confirm availability, shipping and terms privately with the
              merchant.
            </p>
          </div>
          <div>
            <span>
              <Wallet />
            </span>
            <h3>Pay directly. Stay independent.</h3>
            <p>
              Authorize a crypto payment to the merchant. They handle
              fulfilment.
            </p>
          </div>
        </div>
      </section>
      <section className="merchant-banner">
        <div>
          <span className="eyebrow">
            YOUR STORE. YOUR CUSTOMERS. YOUR REVENUE.
          </span>
          <h2>
            Small fee.
            <br />
            Unlimited possibility.
          </h2>
          <p>
            Make your products discoverable without giving away a
            <br className="desktop-break" /> percentage of every sale. Keep what
            you build.
          </p>
          <Link className="button white" to="/sell">
            Start your independent chapter
          </Link>
        </div>
        <div className="price-block">
          <div>
            <sup>$</sup>125<span>/ year</span>
          </div>
          <p>One annual merchant membership.</p>
          <ul>
            <li>
              <Check />
              Unlimited eligible listings
            </li>
            <li>
              <Check />
              0% platform sales commission
            </li>
            <li>
              <Check />
              Direct payments to your wallet
            </li>
            <li>
              <Check />
              Your products and media stay yours
            </li>
          </ul>
          <small>Network fees and independent storage costs may apply.</small>
        </div>
      </section>
      <section className="section faq-section">
        <div>
          <span className="eyebrow">A FEW GOOD QUESTIONS</span>
          <h2>
            Curious? You're
            <br />
            in the right place.
          </h2>
          <Link className="text-link" to="/help">
            Visit the help center
          </Link>
        </div>
        <div className="faq-list">
          {[
            [
              "What makes AisleZero different?",
              "Merchants own their signed product listings and receive purchase payments directly. The marketplace charges a fixed annual merchant subscription, with no sales commission.",
            ],
            [
              "Do I need a wallet just to browse?",
              "No. Explore products and stores freely. You need a compatible payment wallet for checkout and a separate Nostr identity for private messages.",
            ],
            [
              "Who ships my order?",
              "The independent merchant manages shipping, returns, support and applicable taxes. Confirm their terms before authorizing a payment.",
            ],
            [
              "Are crypto payments reversible?",
              "Blockchain transfers generally cannot be reversed by AisleZero. Check the merchant, network, exact receiving address and terms carefully. Refunds are handled directly by the merchant.",
            ],
          ].map(([q, answer]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <div className="safety-strip">
        <ShieldCheck />
        <p>
          A little care goes a long way.{" "}
          <span>Get to know a merchant before you pay.</span>
        </p>
        <Link to="/safety">Shop with confidence</Link>
      </div>
    </>
  );
}
function SearchIcon() {
  return <Package />;
}
function MessageIcon() {
  return <Store />;
}
