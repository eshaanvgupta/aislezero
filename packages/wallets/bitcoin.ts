import { Transaction, p2wpkh, p2tr, Script } from "@scure/btc-signer";
import { hexToBytes, bytesToHex } from "viem";
import { fetchJson } from "../security";
import { config } from "../config";
import type { PaymentIntent } from "../payments";
export async function payBitcoin(
  intent: PaymentIntent,
  sender: string,
  hash: string,
) {
  const wallet = window.unisat!;
  if ((await wallet.getNetwork()) !== "livenet")
    throw new Error("Bitcoin wallet is on the wrong network");
  const publicKey = hexToBytes(`0x${await wallet.getPublicKey()}`);
  const segwit = p2wpkh(publicKey),
    taproot = p2tr(publicKey.slice(1));
  const payment =
    sender === segwit.address
      ? segwit
      : sender === taproot.address
        ? taproot
        : null;
  if (!payment)
    throw new Error(
      "This adapter supports native SegWit and single-key Taproot accounts",
    );
  const [utxos, fees] = await Promise.all([
    fetchJson<
      {
        txid: string;
        vout: number;
        value: number;
        status: { confirmed: boolean };
      }[]
    >(`${config.rpc.bitcoin}/address/${sender}/utxo`),
    fetchJson<Record<string, number>>(`${config.rpc.bitcoin}/fee-estimates`),
  ]);
  const rate = Math.max(1, Math.ceil(fees["6"] || 0));
  if (!fees["6"]) throw new Error("Bitcoin fee estimate unavailable");
  const selected: typeof utxos = [];
  let total = 0n;
  let fee = 0n;
  const amount = BigInt(intent.units);
  for (const u of utxos.filter((u) => u.status.confirmed)) {
    selected.push(u);
    total += BigInt(u.value);
    fee = BigInt(Math.ceil((selected.length * 69 + 125) * rate));
    if (total >= amount + fee + 546n) break;
  }
  if (total < amount + fee + 546n)
    throw new Error(
      "Insufficient confirmed BTC including network fee and change",
    );
  const tx = new Transaction({ allowUnknownOutputs: true });
  for (const u of selected)
    tx.addInput({
      txid: u.txid,
      index: u.vout,
      witnessUtxo: { script: payment.script, amount: BigInt(u.value) },
      ...(sender === taproot.address
        ? { tapInternalKey: publicKey.slice(1) }
        : {}),
    });
  tx.addOutputAddress(intent.recipient, amount);
  tx.addOutput({
    script: Script.encode(["RETURN", hexToBytes(`0x${hash}`)]),
    amount: 0n,
  });
  tx.addOutputAddress(sender, total - amount - fee);
  const psbt = bytesToHex(tx.toPSBT()).slice(2);
  const signed = await wallet.signPsbt(psbt, { autoFinalized: true });
  return wallet.pushPsbt(signed);
}
