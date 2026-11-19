import MiniSearch from "minisearch";
import type { Listing } from "../commerce/schema";
export interface Filters {
  query: string;
  category: string;
  condition: string;
  min: string;
  max: string;
  country: string;
  shipsTo: string;
  asset: string;
  brand: string;
  wholesale: boolean;
  inStock: boolean;
  freeShipping: boolean;
  moq: string;
  sort: string;
  attribute: string;
}
export const emptyFilters: Filters = {
  query: "",
  category: "",
  condition: "",
  min: "",
  max: "",
  country: "",
  shipsTo: "",
  asset: "",
  brand: "",
  wholesale: false,
  inStock: false,
  freeShipping: false,
  moq: "",
  sort: "recent",
  attribute: "",
};
export function searchListings(listings: Listing[], f: Filters) {
  let result = listings;
  if (f.query.trim()) {
    const index = new MiniSearch({
      fields: ["title", "description", "brand", "category"],
      idField: "key",
      searchOptions: { prefix: true, fuzzy: 0.2 },
    });
    index.addAll(
      listings.map((p) => ({
        ...p,
        key: p.seller + ":" + p.id,
        brand: p.extension.brand,
      })),
    );
    const hits = new Set(index.search(f.query).map((x) => x.id));
    result = result.filter((p) => hits.has(p.seller + ":" + p.id));
  }
  result = result.filter(
    (p) =>
      (!f.category || p.category === f.category) &&
      (!f.condition || p.extension.condition === f.condition) &&
      (!f.min || Number(p.price) >= Number(f.min)) &&
      (!f.max || Number(p.price) <= Number(f.max)) &&
      (!f.country ||
        p.extension.country.toLowerCase().includes(f.country.toLowerCase())) &&
      (!f.shipsTo ||
        p.extension.shipsTo.some((s) =>
          s.toLowerCase().includes(f.shipsTo.toLowerCase()),
        )) &&
      (!f.asset || p.extension.assets.includes(f.asset as never)) &&
      (!f.brand ||
        p.extension.brand.toLowerCase().includes(f.brand.toLowerCase())) &&
      (!f.wholesale || p.extension.wholesale) &&
      (!f.inStock || p.extension.quantity > 0) &&
      (!f.freeShipping || Number(p.extension.shipping) === 0) &&
      (!f.moq || p.extension.moq <= Number(f.moq)) &&
      (!f.attribute ||
        JSON.stringify(p.extension.specifications)
          .toLowerCase()
          .includes(f.attribute.toLowerCase())),
  );
  return [...result].sort((a, b) =>
    f.sort === "price-asc"
      ? Number(a.price) - Number(b.price)
      : f.sort === "price-desc"
        ? Number(b.price) - Number(a.price)
        : b.createdAt - a.createdAt,
  );
}
