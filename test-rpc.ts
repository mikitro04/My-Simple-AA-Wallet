import { ethers } from "ethers";
import fetch from "node-fetch";

const rpcPayload = {
  "accountGasLimits": "0x000000000000000000000000000186a0000000000000000000000000000493e0",
  "callData": "0xb61d27f6000000000000000000000000948b3c65b89df0b4894abe91e6d02fe579834f8f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d09de08a00000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x493e0",
  "gasFees": "0x00000000000000000000000077359400000000000000000000000002540be400",
  "initCode": "0x",
  "maxFeePerGas": "0x2540be400",
  "maxPriorityFeePerGas": "0x77359400",
  "nonce": "0x5",
  "paymaster": "0xbcf26943c0197d2ee0e5d05c716be60cc2761508",
  "paymasterAndData": "0xbcf26943c0197d2ee0e5d05c716be60cc2761508000000000000000000000000000186a00000000000000000000000000000c350",
  "paymasterData": "0x",
  "paymasterPostOpGasLimit": "0xc350",
  "paymasterVerificationGasLimit": "0x186a0",
  "preVerificationGas": "0xc350",
  "sender": "0x71C95911E9a5D330f4D621842EC243EE1343292e",
  "signature": "0xf85b86f6b93a2e7c2995be9610a846d13d8d2e8abf7a28db508374f4fb5beb4b35e5b9b4531b2c0b645bf58b5f0cd18434e242cea2f5c6501397872d7cd2fbe11b",
  "verificationGasLimit": "0x186a0"
};

async function main() {
  const req = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_sendUserOperation",
    params: [rpcPayload, "0x8464135c8F25Da09e49BC8782676a84730C318bC"]
  };
  const res = await fetch("http://localhost:3000/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
