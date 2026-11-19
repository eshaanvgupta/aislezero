import { Component, Suspense, lazy, useEffect, type ReactNode } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import { Provider, useApp } from "./state";
import { Header, Footer, WalletModal, Empty } from "./components";
const Governance = lazy(() => import("./Governance"));
const Home = lazy(() => import("./Home"));
const Explore = lazy(() => import("./Explore"));
const Product = lazy(() => import("./Product"));
const Seller = lazy(() => import("./Seller"));
const Checkout = lazy(() => import("./Checkout"));
const Subscription = lazy(() => import("./Subscription"));
const Pages = import("./Pages");
const Saved = lazy(() => Pages.then((m) => ({ default: m.Saved }))),
  Compare = lazy(() => Pages.then((m) => ({ default: m.Compare }))),
  Stores = lazy(() => Pages.then((m) => ({ default: m.Stores }))),
  Sell = lazy(() => Pages.then((m) => ({ default: m.Sell }))),
  Account = lazy(() => Pages.then((m) => ({ default: m.Account }))),
  Help = lazy(() => Pages.then((m) => ({ default: m.Help }))),
  Rfq = lazy(() => Pages.then((m) => ({ default: m.Rfq }))),
  Report = lazy(() => Pages.then((m) => ({ default: m.Report }))),
  Info = lazy(() => Pages.then((m) => ({ default: m.Info })));
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <main className="page">
        <h1>Let's get you back on track.</h1>
        <p>The application could not read this page or a local record.</p>
        <button className="button" onClick={() => location.reload()}>
          Reload application
        </button>
        <details>
          <summary>Technical details</summary>
          <pre>{this.state.error}</pre>
        </details>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Shell() {
  const a = useApp();
  const path = useLocation().pathname;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title =
      path === "/"
        ? "AisleZero — Real products. Direct payments."
        : path.split("/").filter(Boolean).join(" · ") + " | AisleZero";
  }, [path]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Suspense
          fallback={
            <div className="page">
              <div
                className="skeleton page-skeleton"
                aria-label="Loading page"
              />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            {["/explore", "/search", "/category/:slug"].map((p) => (
              <Route key={p} path={p} element={<Explore />} />
            ))}
            <Route path="/wholesale" element={<Explore wholesale />} />
            <Route path="/product/:sellerId/:listingId" element={<Product />} />
            {["/stores", "/store/:sellerId", "/collections"].map((p) => (
              <Route key={p} path={p} element={<Stores />} />
            ))}
            <Route path="/saved" element={<Saved />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/cart" element={<Checkout cartOnly />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/sell" element={<Sell />} />
            <Route
              path="/pricing"
              element={
                <div className="page">
                  <Subscription />
                </div>
              }
            />
            <Route path="/operator" element={<Governance />} />
            <Route path="/rfq" element={<Rfq />} />
            <Route path="/help" element={<Help />} />
            <Route path="/account/*" element={<Account />} />
            <Route path="/seller/listings/:id/edit" element={<Seller />} />
            <Route path="/seller/*" element={<Seller />} />
            {[
              "/how-it-works",
              "/safety",
              "/policies",
              "/privacy",
              "/terms",
              "/prohibited-items",
            ].map((p) => (
              <Route key={p} path={p} element={<Info />} />
            ))}
            {["/report-listing", "/moderation-appeal"].map((p) => (
              <Route key={p} path={p} element={<Report />} />
            ))}
            <Route
              path="*"
              element={
                <div className="page">
                  <Empty
                    title="A little off the beaten aisle."
                    description="This page doesn't exist. There's plenty to discover in the marketplace."
                  />
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      {a.walletModal && <WalletModal />}
    </>
  );
}
export function App() {
  return (
    <ErrorBoundary>
      <Provider>
        <Shell />
      </Provider>
    </ErrorBoundary>
  );
}
