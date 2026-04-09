import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  // Ci connettiamo diretti al Bundler
  const bundlerProvider = new ethers.JsonRpcProvider("http://localhost:3000/rpc");

  // Leggiamo la UserOp firmata
  const filePath = path.join(__dirname, "../../userOp.json");
  if (!fs.existsSync(filePath)) throw new Error("userOp.json non trovato! Esegui prima sign:userop");
  const userOp = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Aggiungiamo i vecchi campi v0.6 per superare i controlli del Bundler locale
  const rpcPayload = {
    ...userOp,
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
