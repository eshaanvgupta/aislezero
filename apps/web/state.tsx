import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Event } from "nostr-tools";
import { parseGovernance, defaultGovernance } from "../../packages/governance";
import { config } from "../../packages/config";
import {
  query,
  latest,
  connectIdentity,
  disconnectIdentity,
} from "../../packages/nostr";
import {
  parseListing,
  profileSchema,
  type Listing,
  type Profile,
  type Order,
} from "../../packages/commerce/schema";
import {
  verifyMembership,
  type Membership,
} from "../../packages/subscriptions";
import { useLocal } from "../../packages/local";
import { errorMessage } from "../../packages/security";
import type { WalletConnection } from "../../packages/wallets";
export interface CartItem {
  seller: string;
  id: string;
  quantity: number;
  variants: Record<string, string>;
}
type Context = {
  listings: Listing[];
  merchantListings: Listing[];
  profiles: Record<string, Profile>;
  memberships: Record<string, Membership>;
  loading: boolean;
  mergeEvents: (events: Event[]) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  identity: string;
  connect: (bunker?: string) => Promise<void>;
  disconnect: () => void;
  wallets: WalletConnection[];
  setWallets: React.Dispatch<React.SetStateAction<WalletConnection[]>>;
  saved: string[];
  setSaved: (v: string[] | ((o: string[]) => string[])) => void;
  compare: string[];
  setCompare: (v: string[] | ((o: string[]) => string[])) => void;
  cart: CartItem[];
  setCart: (v: CartItem[] | ((o: CartItem[]) => CartItem[])) => void;
  orders: Order[];
  setOrders: (v: Order[] | ((o: Order[]) => Order[])) => void;
  notify: (s: string) => void;
  walletModal: boolean;
  setWalletModal: (v: boolean) => void;
  theme: string;
  setTheme: (v: string) => void;
  relays: string[];
  setRelays: (v: string[]) => void;
};
const AppContext = createContext<Context>(null!);
export const listingKey = (p: { seller: string; id: string }) =>
  p.seller + ":" + p.id;
export function Provider({ children }: { children: ReactNode }) {
  const [merchantListings, setMerchantListings] = useState<Listing[]>([]);
  const [listings, setListings] = useState<Listing[]>([]),
    [profiles, setProfiles] = useState<Record<string, Profile>>({}),
    [memberships, setMemberships] = useState<Record<string, Membership>>({}),
    [events, setEvents] = useState<Event[]>([]),
    [loading, setLoading] = useState(false),
    [identity, setIdentity] = useState(""),
    [wallets, setWallets] = useState<WalletConnection[]>([]),
    [toast, setToast] = useState(""),
    [walletModal, setWalletModal] = useState(false);
  const [saved, setSaved] = useLocal<string[]>("saved", []),
    [compare, setCompare] = useLocal<string[]>("compare", []),
    [cart, setCart] = useLocal<CartItem[]>("cart", []),
    [orders, setOrders] = useLocal<Order[]>("orders", []),
    [theme, setTheme] = useLocal("theme", "light"),
    [relays, setRelays] = useLocal("relays", config.relays);
  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 6500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const ingest = useCallback(
    async (all: Event[]) => {
      const membershipEvents = config.issuers.length
        ? await query(
            [{ kinds: [30078], authors: config.issuers, limit: 1000 }],
            relays,
          )
        : [];
      const mem: Record<string, Membership> = {};
      for (const e of latest(membershipEvents)) {
        const m = verifyMembership(e, config.issuers);
        if (m && (!mem[m.merchant] || m.expiresAt > mem[m.merchant].expiresAt))
          mem[m.merchant] = m;
      }
      setMemberships(mem);
      const decisions = config.operator
        ? await query(
            [
              {
                kinds: [30078],
                authors: [config.operator],
                "#d": ["aislezero:governance:v1"],
                limit: 5,
              },
            ],
            relays,
          )
        : [];
      const governance =
        latest(decisions)
          .map((e) => parseGovernance(e, config.operator))
          .find(Boolean) || defaultGovernance;
      const removed = new Map<string, number>();
      for (const e of all.filter((e) => e.kind === 5))
        for (const t of e.tags.filter(
          (t) => t[0] === "a" && t[1]?.split(":")[1] === e.pubkey,
        ))
          removed.set(t[1], Math.max(removed.get(t[1]) || 0, e.created_at));
      const parsed = latest(all.filter((e) => [30402, 30403].includes(e.kind)))
        .map(parseListing)
        .filter((p): p is Listing => !!p)
        .map((p) => ({ ...p, member: !!mem[p.seller] }));
      const own = new Map<string, Listing>();
      for (const p of parsed.filter((p) => p.seller === identity)) {
        const old = own.get(p.id);
        if (!old || p.createdAt > old.createdAt) own.set(p.id, p);
      }
      setMerchantListings([...own.values()]);
      setListings(
        parsed.filter(
          (p) =>
            !governance.blockedListings.includes(
              "30402:" + p.seller + ":" + p.id,
            ) &&
            !governance.blockedMerchants.includes(p.seller) &&
            !governance.prohibitedCategories.includes(p.category) &&
            !governance.restrictedCountries.includes(p.extension.country) &&
            p.status === "active" &&
            p.event.kind === 30402 &&
            (removed.get(`30402:${p.seller}:${p.id}`) || 0) < p.createdAt,
        ),
      );
      const sellers = [...new Set(parsed.map((p) => p.seller))];
      if (identity && !sellers.includes(identity)) sellers.push(identity);
      if (sellers.length) {
        const ps = await query(
          [{ kinds: [0], authors: sellers.slice(0, 200), limit: 200 }],
          relays,
        );
        const prof: Record<string, Profile> = {};
        for (const e of latest(ps)) {
          try {
            prof[e.pubkey] = profileSchema.parse(JSON.parse(e.content));
          } catch {
            /* Other Nostr profiles need not implement commerce fields */
          }
        }
        setProfiles(prof);
      }
    },
    [relays, identity],
  );
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const e = await query([{ kinds: [30402, 30403, 5], limit: 150 }], relays);
      setEvents(e);
      await ingest(e);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [relays, ingest, notify]);
  const loadMore = async () => {
    setLoading(true);
    try {
      const oldest = events.length
        ? Math.min(...events.map((e) => e.created_at))
        : Math.floor(Date.now() / 1000);
      const extra = await query(
        [{ kinds: [30402, 30403, 5], until: oldest - 1, limit: 150 }],
        relays,
      );
      const all = [
        ...new Map([...events, ...extra].map((e) => [e.id, e])).values(),
      ];
      setEvents(all);
      await ingest(all);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    return () => clearInterval(timer);
  }, [refresh]);
  const connect = async (bunker?: string) => {
    const pubkey = await connectIdentity(bunker);
    setIdentity(pubkey);
    notify("Nostr signing identity connected");
  };
  return (
    <AppContext.Provider
      value={{
        listings,
        merchantListings,
        profiles,
        memberships,
        loading,
        mergeEvents: async (extra) => {
          const all = [
            ...new Map([...events, ...extra].map((e) => [e.id, e])).values(),
          ];
          setEvents(all);
          await ingest(all);
        },
        loadMore,
        refresh,
        identity,
        connect,
        disconnect: () => {
          disconnectIdentity();
          setIdentity("");
        },
        wallets,
        setWallets,
        saved,
        setSaved,
        compare,
        setCompare,
        cart,
        setCart,
        orders,
        setOrders,
        notify,
        walletModal,
        setWalletModal,
        theme,
        setTheme,
        relays,
        setRelays,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
export const useApp = () => useContext(AppContext);
