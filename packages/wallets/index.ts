import {
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  type EIP1193Provider,
} from "viem";
import { mainnet, bsc } from "viem/chains";
import { getWallets } from "@wallet-standard/app";
import { base58 } from "@scure/base";
import { config } from "../config";
import { getAsset } from "../payments/assets";
import { intentHash, rpc, type PaymentIntent } from "../payments";
export interface EvmWallet {
  uuid: string;
  name: string;
  provider: EIP1193Provider;
}
export const evmWallets: EvmWallet[] = [];
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", ((e: CustomEvent) => {
    if (!evmWallets.some((w) => w.uuid === e.detail.info.uuid))
      evmWallets.push({
        uuid: e.detail.info.uuid,
        name: String(e.detail.info.name).slice(0, 80),
        provider: e.detail.provider,
      });
  }) as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}
export interface WalletConnection {
  name: string;
  network: string;
  address: string;
  provider?: EIP1193Provider;
  wallet?: any;
  account?: any;
}
export function discoverSolana() {
  return getWallets()
    .get()
    .filter(
      (w) =>
        "solana:signAndSendTransaction" in w.features &&
        "standard:connect" in w.features,
    );
}
export async function connectEvm(w: EvmWallet): Promise<WalletConnection> {
  const a = (await w.provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!a?.[0]) throw new Error("No account returned");
  return { name: w.name, network: "evm", address: a[0], provider: w.provider };
}
export async function connectSolana(wallet: any): Promise<WalletConnection> {
  const { accounts } = await wallet.features["standard:connect"].connect();
  const account = accounts.find((a: any) =>
    a.chains.includes("solana:mainnet"),
  );
  if (!account) throw new Error("Wallet has no Solana mainnet account");
  return {
    name: wallet.name,
    network: "solana",
    address: account.address,
    wallet,
    account,
  };
}
declare global {
  interface Window {
    unisat?: {
      requestAccounts(): Promise<string[]>;
      getNetwork(): Promise<string>;
      getPublicKey(): Promise<string>;
      signPsbt(psbt: string, opts?: unknown): Promise<string>;
      pushPsbt(psbt: string): Promise<string>;
    };
  }
}
export async function connectBitcoin(): Promise<WalletConnection> {
  if (!window.unisat)
    throw new Error(
      "Install a UniSat-compatible Bitcoin wallet with PSBT signing",
    );
  if ((await window.unisat.getNetwork()) !== "livenet")
    throw new Error("Switch your Bitcoin wallet to mainnet");
  const a = await window.unisat.requestAccounts();
  return { name: "UniSat", network: "bitcoin", address: a[0] };
}
export async function pay(intent: PaymentIntent, w: WalletConnection) {
  if (!config.paymentsEnabled)
    throw new Error(
      "Live payments have not been activated by the marketplace operator",
    );
  if (intent.expiresAt <= Date.now() / 1000) throw new Error("Quote expired");
  const a = getAsset(intent.asset);
  const hash = await intentHash(intent);
  if (a.network === "ethereum" || a.network === "bnb") {
    if (!w.provider || w.network !== "evm")
      throw new Error("Select an Ethereum-compatible wallet");
    const chain = a.network === "ethereum" ? mainnet : bsc;
    await w.provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chain.id.toString(16)}` }],
    });
    const current = await w.provider.request({ method: "eth_chainId" });
    if (Number(current) !== chain.id)
      throw new Error("Wallet did not switch to the requested network");
    const client = createWalletClient({
      chain,
      transport: custom(w.provider),
      account: w.address as `0x${string}`,
    });
    return client.sendTransaction({
      to: (a.contract || intent.recipient) as `0x${string}`,
      value: a.contract ? 0n : BigInt(intent.units),
      data: (a.contract
        ? encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [intent.recipient as `0x${string}`, BigInt(intent.units)],
          }) + hash
        : `0x${hash}`) as `0x${string}`,
    });
  }
  if (a.network === "bitcoin") {
    if (w.network !== "bitcoin")
      throw new Error("Select a Bitcoin PSBT wallet");
    const { payBitcoin } = await import("./bitcoin");
    return payBitcoin(intent, w.address, hash);
  }
  if (w.network !== "solana") throw new Error("Select a Solana wallet");
  const { buildSolanaTransfer } = await import("./solana");
  const transaction = await buildSolanaTransfer(intent, w.address, hash);
  const result = await w.wallet.features[
    "solana:signAndSendTransaction"
  ].signAndSendTransaction({
    account: w.account,
    chain: "solana:mainnet",
    transaction,
  });
  return base58.encode(result[0].signature);
}
