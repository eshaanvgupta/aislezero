import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  X,
  Bookmark,
  RefreshCw,
} from "lucide-react";
import { useApp } from "./state";
import { PageTitle, Empty, ProductGrid } from "./components";
import { categories } from "../../packages/config";
import {
  searchListings,
  emptyFilters,
  type Filters,
} from "../../packages/search";
import { assets } from "../../packages/payments/assets";
import { useLocal } from "../../packages/local";
import { query } from "../../packages/nostr";
import { config } from "../../packages/config";
export default function Explore({
  wholesale = false,
}: {
  wholesale?: boolean;
}) {
  const a = useApp();
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    ...emptyFilters,
    query: params.get("q") || "",
    category: slug || "",
    wholesale,
  });
  const [show, setShow] = useState(false),
    [history, setHistory] = useLocal<string[]>("search-history", []),
    [savedSearches, setSavedSearches] = useLocal<Filters[]>(
      "saved-searches",
      [],
    ),
    [coverage, setCoverage] = useState("");
  useEffect(() => {
    setFilters((old) => ({
      ...old,
      category: slug || "",
      query: params.get("q") || "",
      wholesale,
    }));
  }, [slug, params.get("q"), wholesale]);
  const update = (key: keyof Filters, value: string | boolean) =>
    setFilters((old) => ({ ...old, [key]: value }));
  const results = searchListings(
    a.listings.filter((p) => p.member),
    filters,
  );
  const applied = Object.entries(filters).filter(
    ([k, v]) => !!v && k !== "query" && k !== "sort",
  );
  const search = async () => {
    if (filters.query) {
      setHistory((old) =>
        [filters.query, ...old.filter((q) => q !== filters.query)].slice(0, 12),
      );
      setParams({ q: filters.query });
      try {
        const hits = await query(
          [{ kinds: [30402], search: filters.query, limit: 100 }],
          config.searchRelays,
        );
        await a.mergeEvents(hits);
        setCoverage(
          `Independent search relays returned ${hits.length} signed events. Eligibility is reconciled against configured issuers; results are not exhaustive.`,
        );
      } catch {
        setCoverage(
          "Independent search is unavailable. Local catalog search is still active.",
        );
      }
    }
  };
  return (
    <div className="page">
      <PageTitle
        eyebrow={wholesale ? "DIRECT SOURCING" : "THE INDEPENDENT MARKETPLACE"}
        title={
          slug
            ? categories.find((c) => c.slug === slug)?.name || slug
            : wholesale
              ? "Think bigger. Source direct."
              : "Find your next good thing."
        }
        description={
          wholesale
            ? "Discover wholesale listings and connect directly with independent suppliers."
            : "A little curiosity. A world of independent possibilities."
        }
      >
        {wholesale && (
          <Link className="button" to="/rfq">
            Request a quotation
          </Link>
        )}
      </PageTitle>
      <div className="explore-bar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <Search size={20} />
          <input
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            aria-label="Search products"
            placeholder="Products, brands, a little inspiration…"
            list="suggestions"
          />
          <datalist id="suggestions">
            {[...new Set([...a.listings.map((p) => p.title), ...history])]
              .slice(0, 20)
              .map((q) => (
                <option key={q} value={q} />
              ))}
          </datalist>
          <button className="button" type="submit">
            Search
          </button>
        </form>
        <button
          className="button secondary filter-toggle"
          onClick={() => setShow(!show)}
        >
          <SlidersHorizontal size={17} />
          Filters
        </button>
        <button
          className="icon-button"
          aria-label="Refresh listings"
          onClick={() => void a.refresh()}
        >
          <RefreshCw className={a.loading ? "spin" : ""} size={19} />
        </button>
      </div>
      <div className="explore-layout">
        <aside className={"filters " + (show ? "show" : "")}>
          <div className="filter-heading">
            <h2>Refine your finds</h2>
            <button
              className="text-button"
              onClick={() => setFilters({ ...emptyFilters, wholesale })}
            >
              Reset
            </button>
          </div>
          <label>
            Category
            <select
              value={filters.category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Condition
            <select
              value={filters.condition}
              onChange={(e) => update("condition", e.target.value)}
            >
              <option value="">Any condition</option>
              {["new", "like-new", "good", "fair"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <div className="field-row">
            <label>
              Min price, USD
              <input
                type="number"
                min="0"
                value={filters.min}
                onChange={(e) => update("min", e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              Max price, USD
              <input
                type="number"
                min="0"
                value={filters.max}
                onChange={(e) => update("max", e.target.value)}
                placeholder="Any"
              />
            </label>
          </div>
          <label>
            Brand
            <input
              value={filters.brand}
              onChange={(e) => update("brand", e.target.value)}
              placeholder="Any brand"
            />
          </label>
          <label>
            Merchant country
            <input
              value={filters.country}
              onChange={(e) => update("country", e.target.value)}
              placeholder="Any country"
            />
          </label>
          <label>
            Ships to
            <input
              value={filters.shipsTo}
              onChange={(e) => update("shipsTo", e.target.value)}
              placeholder="Country or region"
            />
          </label>
          <label>
            Payment asset & network
            <select
              value={filters.asset}
              onChange={(e) => update("asset", e.target.value)}
            >
              <option value="">All supported assets</option>
              {assets.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.symbol} · {x.network}
                </option>
              ))}
            </select>
          </label>
          <label>
            Product attributes
            <input
              value={filters.attribute}
              onChange={(e) => update("attribute", e.target.value)}
              placeholder="Material, size, RAM…"
            />
          </label>
          <label>
            Maximum minimum order
            <input
              type="number"
              min="1"
              value={filters.moq}
              onChange={(e) => update("moq", e.target.value)}
            />
          </label>
          {(["inStock", "freeShipping", "wholesale"] as const).map((key) => (
            <label className="checkbox" key={key}>
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={(e) => update(key, e.target.checked)}
              />
              {key === "inStock"
                ? "Available stock"
                : key === "freeShipping"
                  ? "Free merchant shipping"
                  : "Wholesale available"}
            </label>
          ))}
          <button
            className="text-button"
            onClick={() => {
              setSavedSearches([...savedSearches, filters]);
              a.notify("Search saved on this device");
            }}
          >
            <Bookmark size={15} />
            Save this search
          </button>
        </aside>
        <section className="results">
          <div className="results-heading">
            <p>
              <b>{results.length}</b> independent finds
            </p>
            <label className="sort-label">
              Sort by
              <select
                value={filters.sort}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="recent">Newest first</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>
          {applied.length > 0 && (
            <div className="filter-chips">
              {applied.map(([k, v]) => (
                <button
                  key={k}
                  onClick={() =>
                    update(
                      k as keyof Filters,
                      typeof v === "boolean" ? false : "",
                    )
                  }
                >
                  {typeof v === "boolean" ? k : String(v)}
                  <X size={13} />
                </button>
              ))}
            </div>
          )}
          {a.loading && results.length === 0 ? (
            <div className="skeleton-grid" aria-label="Loading real listings">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          ) : results.length ? (
            <ProductGrid products={results} />
          ) : (
            <Empty
              title="Your next discovery is taking shape."
              description="No eligible listings match these filters in the current relay catalog. Try a broader search or become a founding merchant."
              action="Bring your store"
              to="/sell"
            />
          )}
          <div className="results-footer">
            <p>
              Results reflect available independent relays. Global coverage and
              inventory are not guaranteed.
            </p>
            <button
              className="button secondary"
              disabled={a.loading}
              onClick={() => void a.loadMore()}
            >
              Load earlier listings
            </button>
          </div>
          {coverage && <p className="notice">{coverage}</p>}
        </section>
      </div>
    </div>
  );
}
