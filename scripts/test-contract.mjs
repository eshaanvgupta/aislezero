import solc from "solc";
import { createVM } from "@ethereumjs/vm";
import {
  createAccount,
  createAddressFromString,
  hexToBytes,
} from "@ethereumjs/util";
import { encodeFunctionData, parseAbi } from "viem";
import assert from "node:assert/strict";
// Test-only ERC20 model: execute transfer calldata plus the trailing order commitment in a real local EVM.
// This is not a production contract, a custody contract, or a token authenticity assertion.
const source =
  "pragma solidity ^0.8.20; contract TestToken { event Transfer(address indexed from,address indexed to,uint256 value); function transfer(address to,uint256 amount) external returns(bool){require(to!=address(0));emit Transfer(msg.sender,to,amount);return true;} }";
const result = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: { "TestToken.sol": { content: source } },
      settings: {
        evmVersion: "shanghai",
        outputSelection: { "*": { "*": ["evm.deployedBytecode.object"] } },
      },
    }),
  ),
);
assert(
  !result.errors?.some((e) => e.severity === "error"),
  JSON.stringify(result.errors),
);
const vm = await createVM();
const caller = createAddressFromString("0x" + "11".repeat(20)),
  contract = createAddressFromString("0x" + "22".repeat(20));
await vm.stateManager.putAccount(
  caller,
  createAccount({ balance: 10n ** 20n }),
);
await vm.stateManager.putAccount(contract, createAccount({}));
await vm.stateManager.putCode(
  contract,
  hexToBytes(
    "0x" +
      result.contracts["TestToken.sol"].TestToken.evm.deployedBytecode.object,
  ),
);
const abi = parseAbi([
  "function transfer(address to,uint256 amount) returns(bool)",
]);
const data = encodeFunctionData({
  abi,
  functionName: "transfer",
  args: ["0x" + "33".repeat(20), 125000000n],
});
const success = await vm.evm.runCall({
  caller,
  to: contract,
  data: hexToBytes(data + "44".repeat(32)),
  gasLimit: 100000n,
});
assert.equal(success.execResult.exceptionError, undefined);
assert.equal(success.execResult.logs.length, 1);
const zero = encodeFunctionData({
  abi,
  functionName: "transfer",
  args: ["0x" + "00".repeat(20), 125000000n],
});
const failure = await vm.evm.runCall({
  caller,
  to: contract,
  data: hexToBytes(zero + "44".repeat(32)),
  gasLimit: 100000n,
});
assert(failure.execResult.exceptionError);
console.log(
  "PASS: real local EVM accepts reference-bound transfer calldata and rejects zero destinations (2 checks).",
);
