import { useState } from "react";
import { Check, ShieldCheck, Wallet } from "lucide-react";
import { useApp } from "./state";
import { PageTitle } from "./components";
import { config } from "../../packages/config";
import { assets, getAsset } from "../../packages/payments/assets";
import { fetchJson, errorMessage, download } from "../../packages/security";
import {
  verifyMembership,
  verifyIssuerQuote,
} from "../../packages/subscriptions";
import { publish, sign } from "../../packages/nostr";
import { pay } from "../../packages/wallets";
import { formatUnits, type PaymentIntent } from "../../packages/payments";
import type { Event } from "nostr-tools";
export default function Subscription() {
  const a = useApp();
  const [asset, setAsset] = useState("ETH:ethereum"),
    [quote, setQuote] = useState<Event>(),
    [tx, setTx] = useState(""),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<Event>();
  const member = a.memberships[a.identity];
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      a.notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const requestQuote = async () => {
    if (!config.issuerUrl)
      throw new Error(
        "Operator must deploy and configure the stateless membership issuer first",
      );
    const auth = await sign({
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["u", config.issuerUrl + "/quote"],
        ["method", "POST"],
      ],
      content: JSON.stringify({ merchant: a.identity, asset }),
    });
    const result = await fetchJson<{ quote: Event }>(
      config.issuerUrl + "/quote",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth }),
      },
    );
    verifyIssuerQuote(result.quote, config.issuers, a.identity, asset);
    setQuote(result.quote);
  };
  const verify = async () => {
    if (!quote || !tx)
      throw new Error("A signed quote and transaction reference are required");
    const result = await fetchJson<{ credential: Event }>(
      config.issuerUrl + "/claim",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote, transaction: tx }),
      },
    );
    const membership = verifyMembership(result.credential, config.issuers);
    if (
      !membership ||
      membership.merchant !== a.identity ||
      membership.transaction !== tx
    )
      throw new Error(
        "Issuer returned a membership credential for the wrong identity or receipt",
      );
    await publish(result.credential, a.relays);
    setReceipt(result.credential);
    await a.refresh();
    a.notify(
      "Membership payment independently verified and entitlement published",
    );
  };
  let intent: PaymentIntent | undefined;
  try {
    intent = quote ? JSON.parse(quote.content) : undefined;
  } catch {}
  return (
    <>
      <PageTitle
        eyebrow="YOUR STORE. YOUR CUSTOMERS. YOUR REVENUE."
        title="One membership. Your whole store."
        description="A simple annual price for independent merchants. Buyers browse and shop without a platform subscription."
      />
      <div className="subscription-layout">
        <section className="subscription-price">
          <span className="eyebrow">THE INDEPENDENT MERCHANT PLAN</span>
          <div className="big-price">
            <sup>$</sup>125<span>/ year</span>
          </div>
          <p>365 days from confirmed activation.</p>
          <ul>
            {[
              "Unlimited eligible product listings",
              "Zero platform sales commissions",
              "Zero per-product platform listing fees",
              "Direct buyer-to-merchant payments",
              "Merchant-owned listings and media",
            ].map((x) => (
              <li key={x}>
                <Check size={18} />
                {x}
              </li>
            ))}
          </ul>
          <p className="fine">
            Blockchain fees and independent storage costs may apply. Paid
            membership is not identity or business verification.
          </p>
        </section>
        <section className="panel">
          <h2>{member ? "Your membership is active." : "Make it official."}</h2>
          {member && (
            <p className="notice">
              Valid until {new Date(member.expiresAt * 1000).toLocaleString()}.
              Renewals start from the new payment's confirmed time.
            </p>
          )}
          <label>
            Asset & network
            <select
              value={asset}
              onChange={(e) => {
                setAsset(e.target.value);
                setQuote(undefined);
              }}
            >
              {assets.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.symbol} · {x.network}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button full"
            disabled={
              busy ||
              !a.identity ||
              !config.paymentsEnabled ||
              !config.issuerUrl
            }
            onClick={() => void act(requestQuote)}
          >
            Get a live signed quote
          </button>
          {!config.issuerUrl || !config.paymentsEnabled ? (
            <p className="notice">
              Membership payments are awaiting operator activation. Treasury
              addresses, issuer keys, allowed regions and live network
              verification must be configured before accepting funds.
            </p>
          ) : null}
          {intent && (
            <>
              <p className="payment-amount">
                {formatUnits(intent.units, getAsset(intent.asset).decimals)}{" "}
                {getAsset(intent.asset).symbol}
              </p>
              <label>
                Operator subscription treasury
                <code className="address-display">{intent.recipient}</code>
              </label>
              <p>
                Quote expires{" "}
                {new Date(intent.expiresAt * 1000).toLocaleString()}. Source:{" "}
                {intent.source}.
              </p>
              <button
                className="button"
                disabled={busy || !a.wallets.length}
                onClick={() =>
                  void act(async () => {
                    setTx(await pay(intent!, a.wallets[0]));
                    a.notify(
                      "Subscription transaction submitted; verification is required",
                    );
                  })
                }
              >
                Authorize subscription payment
              </button>
              <label>
                Transaction reference
                <input value={tx} onChange={(e) => setTx(e.target.value)} />
              </label>
              <button
                className="button secondary"
                disabled={busy || !tx}
                onClick={() => void act(verify)}
              >
                Verify & activate membership
              </button>
            </>
          )}
          {receipt && (
            <button
              className="text-button"
              onClick={() =>
                download(
                  "membership-receipt.json",
                  JSON.stringify(receipt, null, 2),
                )
              }
            >
              Download signed membership receipt
            </button>
          )}
          <p className="fine">
            <ShieldCheck size={16} />
            Only verified payment can activate your membership.
          </p>
        </section>
      </div>
    </>
  );
}
