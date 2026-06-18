import { Address, createPublicClient, Hex, http } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { PackedUserOperation } from "viem";
import { defineChain } from "viem";

export const anvil8546 = /*#__PURE__*/ defineChain({
  id: 8546,
  name: "Anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
      webSocket: ["ws://127.0.0.1:8545"],
    },
  },
});

export async function sendUserOp(
  userOp: PackedUserOperation,
  entryPoint: Address,
): Promise<Hex> {
  // Invece di usare unPackUserOperation (che nasconde i campi richiesti dal Bundler),
  // costruiamo il payload RPC ibrido per evitare l'errore "Missing userOp field".
  const hybridRpcPayload: any = {
    sender: userOp.sender,
    nonce: `0x${BigInt(userOp.nonce).toString(16)}`, // cast in hex
    initCode: userOp.initCode,
    callData: userOp.callData,
    accountGasLimits: userOp.accountGasLimits,
    preVerificationGas: `0x${BigInt(userOp.preVerificationGas).toString(16)}`, // cast in hex
    gasFees: userOp.gasFees,
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature,

    // --- CAMPI IBRIDI (richiesti dal validatore RPC del Bundler locale) ---
    callGasLimit: "0x493e0",             // ~300000
    verificationGasLimit: "0x186a0",     // ~100000
    maxFeePerGas: "0x12a05f200",         // 5 Gwei
    maxPriorityFeePerGas: "0x3b9aca00",  // 1 Gwei
    paymasterVerificationGasLimit: "0x186a0",
    paymasterPostOpGasLimit: "0xc350"
  };

  const publicClient = createPublicClient({
    chain: anvil8546,
    transport: http("http://127.0.0.1:8545"),
  });

  const bundlerClient = createBundlerClient({
    client: publicClient,
    transport: http("http://localhost:3000/rpc"), // bundler RPC
  });

  // Passiamo l'hybrid payload bypassando i tipi nativi di viem per questa specifica chiamata
  const txHash = await bundlerClient.request({
    method: "eth_sendUserOperation",
    params: [hybridRpcPayload, entryPoint]
  });

  return txHash;
}