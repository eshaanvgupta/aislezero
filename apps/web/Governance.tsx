import { useState } from "react";
import { useApp } from "./state";
import { PageTitle } from "./components";
import { config } from "../../packages/config";
import { defaultGovernance, governanceSchema } from "../../packages/governance";
import { publishTemplate } from "../../packages/nostr";
import { canonical, errorMessage } from "../../packages/security";
export default function Governance() {
  const a = useApp();
  const [text, setText] = useState(JSON.stringify(defaultGovernance, null, 2));
  const submit = async () => {
    try {
      if (!config.operator || a.identity !== config.operator)
        throw new Error("Connect the configured operator signing identity");
      const body = governanceSchema.parse(JSON.parse(text));
      await publishTemplate(
        {
          kind: 30078,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["d", "aislezero:governance:v1"]],
          content: canonical(body),
        },
        a.relays,
      );
      a.notify(
        "Signed policy decisions published. Refresh discovery to apply.",
      );
      await a.refresh();
    } catch (e) {
      a.notify(errorMessage(e));
    }
  };
  return (
    <div className="page">
      <PageTitle
        eyebrow="SIGNED PLATFORM GOVERNANCE"
        title="Keep the marketplace accountable."
        description="Only the configured operator identity can publish authoritative visibility decisions. Independent relay content remains merchant-owned."
      />
      <section className="panel form-panel">
        <label>
          Versioned governance record
          <textarea
            className="mono"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
          />
        </label>
        <button
          className="button"
          disabled={!config.operator || a.identity !== config.operator}
          onClick={() => void submit()}
        >
          Sign & publish policy decisions
        </button>
        <p className="fine">
          Remove a listing or merchant from the blocklists to restore
          eligibility. Give a reason for each restriction. Reports and appeals
          arrive through the operator's private NIP-17 inbox. Source-controlled
          branding, issuer trust, treasury and payment activation require
          reviewed deployment changes.
        </p>
      </section>
    </div>
  );
}
