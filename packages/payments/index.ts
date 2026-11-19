import Decimal from "decimal.js";
import { Address } from "@scure/btc-signer";
import { z } from "zod";
import { verifyEvent, getEventHash, type Event } from "nostr-tools";
import {
  isAddress,
  encodeFunctionData,
  decodeEventLog,
  erc20Abi,
  createPublicClient,
  http,
  hexToBytes,
  bytesToHex,
} from "viem";
import { mainnet, bsc } from "viem/chains";
import { base58 } from "@scure/base";
import { config } from "../config";
import { canonical, fetchJson, pubkeySchema } from "../security";
import { getAsset, type Asset } from "./assets";
Decimal.set({ precision: 60, rounding: Decimal.ROUND_UP });
export function toUnits(amount: string, decimals: number): bigint {
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(amount)) throw new Error("Invalid amount");
  const d = new Decimal(amount).mul(new Decimal(10).pow(decimals));
  if (!d.isInteger()) throw new Error("Amount has too many decimal places");
  return BigInt(d.toFixed(0));
}
export function quoteUnits(
  usd: string,
  rate: string,
  decimals: number,
): bigint {
  if (new Decimal(usd).lte(0) || new Decimal(rate).lte(0))
    throw new Error("Price and rate must be positive");
  return BigInt(
    new Decimal(usd)
      .div(rate)
      .mul(new Decimal(10).pow(decimals))
      .ceil()
      .toFixed(0),
  );
}
export function formatUnits(units: string | bigint, decimals: number) {
  return new Decimal(String(units))
    .div(new Decimal(10).pow(decimals))
    .toFixed();
}
export function validateAddress(address: string, asset: Asset) {
  if (asset.network === "ethereum" || asset.network === "bnb") {
    if (!isAddress(address) || /^0x0{40}$/i.test(address))
      throw new Error("Invalid EVM receiving address");
  } else if (asset.network === "solana") {
    try {
      if (base58.decode(address).length !== 32) throw 0;
    } catch {
      throw new Error("Invalid Solana address");
    }
  } else {
    try {
      Address().decode(address);
    } catch {
      throw new Error(
        "A valid, checksummed Bitcoin mainnet address is required",
      );
    }
  }
}
export const paymentIntentSchema = z.object({
  version: z.literal(1),
  orderId: z.string().uuid(),
  listing: z.string().min(1).max(300),
  buyer: pubkeySchema,
  seller: pubkeySchema,
  asset: z.string(),
  recipient: z.string(),
  units: z.string().regex(/^[1-9]\d{0,38}$/),
  createdAt: z.number().int(),
  expiresAt: z.number().int(),
  usd: z.string(),
  source: z.string(),
  rate: z.string(),
  purpose: z.enum(["purchase", "subscription"]).default("purchase"),
});
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
export function validateIntent(
  event: Event,
  expected: {
    seller: string;
    buyer: string;
    orderId: string;
    listing?: string;
  },
  now = Math.floor(Date.now() / 1000),
): PaymentIntent {
  if (
    !verifyEvent(event) ||
    event.id !== getEventHash(event) ||
    event.kind !== 30078 ||
    event.pubkey !== expected.seller
  )
    throw new Error("Payment request signature does not match the merchant");
  const v = paymentIntentSchema.parse(JSON.parse(event.content));
  const a = getAsset(v.asset);
  validateAddress(v.recipient, a);
  if (
    v.seller !== expected.seller ||
    v.buyer !== expected.buyer ||
    v.orderId !== expected.orderId ||
    (expected.listing !== undefined && v.listing !== expected.listing) ||
    v.purpose !== "purchase" ||
    event.tags.find((t) => t[0] === "d")?.[1] !==
      `aislezero:payment:${v.orderId}`
  )
    throw new Error("Payment request is not bound to this buyer and order");
  if (
    v.expiresAt <= now ||
    v.createdAt > now + 60 ||
    v.expiresAt - v.createdAt > 900
  )
    throw new Error(
      "Payment quote expired or has an invalid lifetime. Ask the merchant for a new quote.",
    );
  return v;
}
export async function intentHash(intent: PaymentIntent) {
  return bytesToHex(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonical(intent)),
      ),
    ),
  ).slice(2);
}
export async function freshRate(asset: Asset) {
  const data = await fetchJson<
    Record<string, { usd: number; last_updated_at: number }>
  >(
    `https://api.coingecko.com/api/v3/simple/price?ids=${asset.rateId}&vs_currencies=usd&include_last_updated_at=true`,
  );
  const r = data[asset.rateId];
  if (
    !r ||
    r.usd <= 0 ||
    Math.floor(Date.now() / 1000) - r.last_updated_at > 300
  )
    throw new Error(
      "A fresh exchange rate is unavailable. Please retry later.",
    );
  return {
    rate: String(r.usd),
    source: "CoinGecko",
    timestamp: r.last_updated_at,
  };
}
export async function rpc<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const r = await fetchJson<{ result: T; error?: { message: string } }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (r.error) throw new Error(r.error.message);
  return r.result;
}
export interface VerifiedPayment {
  transaction: string;
  blockTime: number;
  network: string;
  units: string;
  intent: string;
}
export async function verifyPayment(
  intent: PaymentIntent,
  transaction: string,
  endpoints = config.rpc,
): Promise<VerifiedPayment> {
  const a = getAsset(intent.asset);
  validateAddress(intent.recipient, a);
  const hash = await intentHash(intent);
  let blockTime = 0;
  if (a.network === "ethereum" || a.network === "bnb") {
    if (!/^0x[a-fA-F0-9]{64}$/.test(transaction))
      throw new Error("Invalid EVM transaction hash");
    const client = createPublicClient({
      chain: a.network === "ethereum" ? mainnet : bsc,
      transport: http(endpoints[a.network]),
    });
    if ((await client.getChainId()) !== a.chainId)
      throw new Error("RPC returned the wrong blockchain");
    const [tx, receipt, head] = await Promise.all([
      client.getTransaction({ hash: transaction as `0x${string}` }),
      client.getTransactionReceipt({ hash: transaction as `0x${string}` }),
      client.getBlockNumber(),
    ]);
    if (
      receipt.status !== "success" ||
      head - receipt.blockNumber + 1n < BigInt(a.confirmations)
    )
      throw new Error("Payment is pending sufficient successful confirmations");
    const suffix = hash.toLowerCase();
    if (a.contract) {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [intent.recipient as `0x${string}`, BigInt(intent.units)],
      });
      if (
        tx.to?.toLowerCase() !== a.contract.toLowerCase() ||
        tx.input.toLowerCase() !== (data + suffix).toLowerCase() ||
        tx.value !== 0n
      )
        throw new Error(
          "Wrong token contract, amount, recipient, or payment intent",
        );
      const transfer = receipt.logs.some((log) => {
        try {
          const e = decodeEventLog({
            abi: erc20Abi,
            eventName: "Transfer",
            data: log.data,
            topics: log.topics,
          });
          return (
            log.address.toLowerCase() === a.contract!.toLowerCase() &&
            e.args.to.toLowerCase() === intent.recipient.toLowerCase() &&
            e.args.from.toLowerCase() === tx.from.toLowerCase() &&
            e.args.value === BigInt(intent.units)
          );
        } catch {
          return false;
        }
      });
      if (!transfer) throw new Error("Expected token transfer was not emitted");
    } else if (
      tx.to?.toLowerCase() !== intent.recipient.toLowerCase() ||
      tx.value !== BigInt(intent.units) ||
      tx.input.toLowerCase() !== `0x${suffix}`
    )
      throw new Error("Wrong destination, amount, or payment intent");
    blockTime = Number(
      (await client.getBlock({ blockNumber: receipt.blockNumber })).timestamp,
    );
  } else if (a.network === "solana") {
    if (base58.decode(transaction).length !== 64)
      throw new Error("Invalid Solana transaction signature");
    const genesis = await rpc<string>(endpoints.solana, "getGenesisHash", []);
    if (genesis !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")
      throw new Error("RPC is not Solana mainnet");
    const tx = await rpc<any>(endpoints.solana, "getTransaction", [
      transaction,
      {
        encoding: "jsonParsed",
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
      },
    ]);
    if (!tx || !tx.meta || tx.meta.err || !tx.blockTime)
      throw new Error("Payment is not finalized successfully");
    const instructions = tx.transaction.message.instructions;
    if (
      !instructions.some(
        (i: any) =>
          i.programId === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr" &&
          i.parsed === `az:${hash}`,
      )
    )
      throw new Error("Missing order commitment");
    let ok = false;
    if (!a.contract)
      ok = instructions.some(
        (i: any) =>
          i.programId === "11111111111111111111111111111111" &&
          i.parsed?.type === "transfer" &&
          i.parsed.info.destination === intent.recipient &&
          BigInt(i.parsed.info.lamports) === BigInt(intent.units),
      );
    else {
      const accounts = tx.transaction.message.accountKeys.map(
        (k: any) => k.pubkey,
      );
      const balances = tx.meta.postTokenBalances || [];
      ok = instructions.some((i: any) => {
        const p = i.parsed;
        const b = balances.find(
          (b: any) => accounts[b.accountIndex] === p?.info?.destination,
        );
        return (
          i.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
          p?.type === "transferChecked" &&
          p.info.mint === a.contract &&
          p.info.tokenAmount.amount === intent.units &&
          p.info.tokenAmount.decimals === a.decimals &&
          b?.owner === intent.recipient &&
          b?.mint === a.contract
        );
      });
    }
    if (!ok) throw new Error("Wrong asset mint, receiving owner, or amount");
    blockTime = tx.blockTime;
  } else {
    if (!/^[a-f0-9]{64}$/i.test(transaction))
      throw new Error("Invalid Bitcoin transaction ID");
    const [tx, tip] = await Promise.all([
      fetchJson<any>(`${endpoints.bitcoin}/tx/${transaction}`),
      fetch(`${endpoints.bitcoin}/blocks/tip/height`, {
        signal: AbortSignal.timeout(15000),
      })
        .then((r) => r.text())
        .then(Number),
    ]);
    if (
      !tx.status?.confirmed ||
      tip - tx.status.block_height + 1 < a.confirmations
    )
      throw new Error("Bitcoin payment is awaiting six confirmations");
    const paid = tx.vout
      .filter((o: any) => o.scriptpubkey_address === intent.recipient)
      .reduce((s: bigint, o: any) => s + BigInt(o.value), 0n);
    const bound = tx.vout.some((o: any) => o.scriptpubkey === `6a20${hash}`);
    if (paid !== BigInt(intent.units) || !bound)
      throw new Error(
        "Wrong Bitcoin amount, receiving address, or OP_RETURN order commitment",
      );
    blockTime = tx.status.block_time;
  }
  // A timely broadcast cannot be proved from mempool data: confirmed block time is authoritative.
  if (blockTime < intent.createdAt - 120 || blockTime > intent.expiresAt)
    throw new Error(
      "Payment settled outside the signed quote window; ask the merchant to reconcile it.",
    );
  return {
    transaction,
    blockTime,
    network: a.network,
    units: intent.units,
    intent: hash,
  };
}
