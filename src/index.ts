import "dotenv/config";
import { buildUserOp } from "../userop/BuildUserOp";
import { ethers } from "ethers";
import { EntryPointABI } from "../utils/ABI/EntryPointABI";

async function main() {
  const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  const ACCOUNT = "0x71C95911E9a5D330f4D621842EC243EE1343292e";
  const COUNTER = "0x948B3c65b89DF0B4894ABE91E6D02FE579834F8F";

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const bundlerProvider = new ethers.JsonRpcProvider("http://localhost:3000/rpc");
  
  const wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY!, provider);

  const baseOp: any = await buildUserOp({
    provider,
    entryPoint: ENTRY_POINT,
    sender: ACCOUNT,
    target: COUNTER,
    data: "0xd09de08a",
  });

  // --- FIX: Calcoliamo il nonce in modo DINAMICO leggendolo dalla chain ---
  // Trasformiamo il BigInt in una stringa esadecimale
  const currentNonce = "0x" + BigInt(baseOp.nonce).toString(16);
  console.log("Current Nonce from blockchain:", currentNonce);

  // Oggetto base in formato v0.7
  const packedUserOp = {
    sender: ACCOUNT,
    nonce: currentNonce, // Usiamo il nonce dinamico
    initCode: baseOp.initCode || "0x",
    callData: baseOp.callData,
    accountGasLimits: "0x000000000000000000000000000186a0000000000000000000000000000493e0",
    preVerificationGas: "0xc350",
    gasFees: "0x0000000000000000000000003b9aca000000000000000000000000012a05f200",
    paymasterAndData: baseOp.paymasterAndData || "0x",
    signature: "0x"
  };

  const entryPointContract = new ethers.Contract(ENTRY_POINT, EntryPointABI, provider);
  
  const userOpHash = await entryPointContract.getUserOpHash(packedUserOp);
  packedUserOp.signature = await wallet.signMessage(ethers.getBytes(userOpHash));
  console.log("UserOp signed successfully");

  const rpcPayload = {
    ...packedUserOp,
    callGasLimit: "0x493e0",         
    verificationGasLimit: "0x186a0", 
    maxFeePerGas: "0x12a05f200",     
    maxPriorityFeePerGas: "0x3b9aca00" 
  };

  console.log("Sending Hybrid RPC Payload to Bundler...");
  try {
    const txHash = await bundlerProvider.send("eth_sendUserOperation", [rpcPayload, ENTRY_POINT]);
    console.log("SUCCESS! Transaction Hash:", txHash);
  } catch (error: any) {
    console.error("Bundler rejected the UserOp:", error.info?.error?.message || error.message);
  }
}

main().catch(console.error);