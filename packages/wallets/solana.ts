import {
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  getTransactionEncoder,
  AccountRole,
  type Instruction,
  blockhash,
} from "@solana/kit";
import { getAsset } from "../payments/assets";
import { rpc, type PaymentIntent } from "../payments";
import { config } from "../config";
function u64(n: bigint) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
}
export async function buildSolanaTransfer(
  intent: PaymentIntent,
  sender: string,
  hash: string,
) {
  const a = getAsset(intent.asset);
  const from = address(sender),
    to = address(intent.recipient);
  const instructions: Instruction[] = [];
  if (!a.contract)
    instructions.push({
      programAddress: address("11111111111111111111111111111111"),
      accounts: [
        { address: from, role: AccountRole.WRITABLE_SIGNER },
        { address: to, role: AccountRole.WRITABLE },
      ],
      data: new Uint8Array([2, 0, 0, 0, ...u64(BigInt(intent.units))]),
    });
  else {
    const token = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const associated = address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    const mint = address(a.contract);
    const encode = getAddressEncoder();
    const ata = async (owner: ReturnType<typeof address>) =>
      (
        await getProgramDerivedAddress({
          programAddress: associated,
          seeds: [
            encode.encode(owner),
            encode.encode(token),
            encode.encode(mint),
          ],
        })
      )[0];
    const source = await ata(from),
      destination = await ata(to);
    // Idempotent ATA creation; wallet shows any network rent in its confirmation.
    instructions.push({
      programAddress: associated,
      accounts: [
        { address: from, role: AccountRole.WRITABLE_SIGNER },
        { address: destination, role: AccountRole.WRITABLE },
        { address: to, role: AccountRole.READONLY },
        { address: mint, role: AccountRole.READONLY },
        {
          address: address("11111111111111111111111111111111"),
          role: AccountRole.READONLY,
        },
        { address: token, role: AccountRole.READONLY },
      ],
      data: new Uint8Array([1]),
    });
    instructions.push({
      programAddress: token,
      accounts: [
        { address: source, role: AccountRole.WRITABLE },
        { address: mint, role: AccountRole.READONLY },
        { address: destination, role: AccountRole.WRITABLE },
        { address: from, role: AccountRole.READONLY_SIGNER },
      ],
      data: new Uint8Array([12, ...u64(BigInt(intent.units)), a.decimals]),
    });
  }
  instructions.push({
    programAddress: address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    accounts: [{ address: from, role: AccountRole.READONLY_SIGNER }],
    data: new TextEncoder().encode(`az:${hash}`),
  });
  const { value } = await rpc<{
    value: { blockhash: string; lastValidBlockHeight: number };
  }>(config.rpc.solana, "getLatestBlockhash", [{ commitment: "finalized" }]);
  let message = setTransactionMessageFeePayer(
    from,
    createTransactionMessage({ version: 0 }),
  );
  const timed = setTransactionMessageLifetimeUsingBlockhash(
    {
      blockhash: blockhash(value.blockhash),
      lastValidBlockHeight: BigInt(value.lastValidBlockHeight),
    },
    message,
  );
  return new Uint8Array(
    getTransactionEncoder().encode(
      compileTransaction(
        appendTransactionMessageInstructions(instructions, timed),
      ),
    ),
  );
}
