import "dotenv/config";
import { ethers } from "ethers";
import { EntryPointABI } from "../../utils/ABI/EntryPointABI";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY!, provider);

  // Leggiamo i dati creati dal comando precedente
  const filePath = path.join(__dirname, "../../userOp.json");
  if (!fs.existsSync(filePath)) throw new Error("userOp.json non trovato! Esegui prima build:userop");
  const userOp = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Calcoliamo l'hash usando l'ABI esatta per evitare errori
  const entryPointContract = new ethers.Contract(ENTRY_POINT, EntryPointABI, provider);
  const userOpHash = await entryPointContract.getUserOpHash(userOp);
  console.log("On-chain UserOpHash:", userOpHash);

  // Firmiamo
  userOp.signature = await wallet.signMessage(ethers.getBytes(userOpHash));
  console.log("UserOp signed successfully");

  // Salviamo l'oggetto aggiornato con la firma
  fs.writeFileSync(filePath, JSON.stringify(userOp, null, 2));
  console.log("UserOp firmata salvata in userOp.json");
}

main().catch(console.error);
