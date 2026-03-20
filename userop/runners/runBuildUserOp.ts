import "dotenv/config";
import { buildUserOp } from "../BuildUserOp";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  const ACCOUNT = "0x71C95911E9a5D330f4D621842EC243EE1343292e";
  const COUNTER = "0x948B3c65b89DF0B4894ABE91E6D02FE579834F8F";

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  const baseOp: any = await buildUserOp({
    provider,
    entryPoint: ENTRY_POINT,
    sender: ACCOUNT,
    target: COUNTER,
    data: "0xd09de08a",
  });

  // Calcolo del nonce dinamico (fondamentale per non avere AA25)
  const currentNonce = "0x" + BigInt(baseOp.nonce).toString(16);

  // Creiamo l'oggetto v0.7 perfetto
  const packedUserOp = {
    sender: ACCOUNT,
    nonce: currentNonce,
    initCode: baseOp.initCode || "0x",
    callData: baseOp.callData,
    accountGasLimits: "0x000000000000000000000000000186a0000000000000000000000000000493e0",
    preVerificationGas: "0xc350",
    gasFees: "0x0000000000000000000000003b9aca000000000000000000000000012a05f200",
    paymasterAndData: baseOp.paymasterAndData || "0x",
    signature: "0x"
  };

  console.log("PackedUserOp built:", packedUserOp);

  // Salviamo i dati in un file locale per il passaggio successivo
  const filePath = path.join(__dirname, "../../userOp.json");
  fs.writeFileSync(filePath, JSON.stringify(packedUserOp, null, 2));
  console.log("Dati salvati in userOp.json");
}

main().catch(console.error);
