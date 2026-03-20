import { privateKeyToAccount } from "viem/accounts";
import { EntryPointABI } from "../utils/ABI/EntryPointABI";
import { Hex, PackedUserOperation } from "viem";
import { Address } from "viem";
import { ethers } from "ethers";
import "dotenv/config";
import { recoverMessageAddress } from "viem";

export async function signUserOp(
  userOp: PackedUserOperation,
  entryPointAddress: Address,
  provider: ethers.JsonRpcProvider,
): Promise<PackedUserOperation> {
  const ownerAccount = privateKeyToAccount(
    process.env.OWNER_PRIVATE_KEY as `0x${string}`,
  );

  const entryPoint = new ethers.Contract(
    entryPointAddress,
    EntryPointABI,
    provider,
  );

  const userOpHash = await entryPoint.getUserOpHash(userOp);

  // --- FIX: Passa l'hash come 'raw' per firmare i byte corretti ---
  const signature = await ownerAccount.signMessage({
    message: { raw: userOpHash as Hex },
  });

  return {
    ...userOp,
    signature,
  };
}