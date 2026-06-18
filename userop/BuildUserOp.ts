import { ethers } from "ethers";
import { EntryPointABI } from "../utils/ABI/EntryPointABI";
import {
    Hex,
    PackedUserOperation,
    Address,
} from "viem";

const PAYMASTER =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Address;

export async function buildUserOp({
    provider,
    entryPoint,
    sender,
    target,
    value = 0n,
    data,
}: {
    provider: ethers.JsonRpcProvider;
    entryPoint: Address;
    sender: Address;
    target: Address;
    value?: bigint;
    data: Hex;
}): Promise<PackedUserOperation> {
    const epContract = new ethers.Contract(
        entryPoint,
        EntryPointABI,
        provider
    );

    // 1. Nonce letto dall'EntryPoint
    const nonce: bigint =
        await epContract.getNonce(sender, 0);

    // 2. Encode execute(target, value, calldata)
    const accountInterface =
        new ethers.Interface([
            "function execute(address,uint256,bytes)",
        ]);

    const callData =
        accountInterface.encodeFunctionData(
            "execute",
            [target, value, data]
        ) as `0x${string}`;

    // -------------------------------------------------
    // PAYMASTER DATA (ERC-4337 v0.7)
    // layout: paymaster (20 bytes) | paymasterVerificationGasLimit (16 bytes) | paymasterPostOpGasLimit (16 bytes)
    // -------------------------------------------------
    const paymasterVerificationGas = ethers.zeroPadValue(ethers.toBeHex(100000n), 16);
    const paymasterPostOpGas = ethers.zeroPadValue(ethers.toBeHex(50000n), 16);
    
    const paymasterAndData = ethers.concat([
        PAYMASTER,
        paymasterVerificationGas,
        paymasterPostOpGas,
    ]) as Hex;

    console.log("\nPaymasterAndData built:", paymasterAndData);
    console.log("PaymasterAndData length:", paymasterAndData.length);

    // -------------------------------------------------
    // ACCOUNT GAS LIMITS (ERC-4337 v0.7)
    // layout: verificationGasLimit (16 bytes) | callGasLimit (16 bytes)
    // -------------------------------------------------
    const verificationGasLimit = ethers.zeroPadValue(ethers.toBeHex(100000n), 16);
    const callGasLimit = ethers.zeroPadValue(ethers.toBeHex(300000n), 16);
    
    const accountGasLimits = ethers.concat([
        verificationGasLimit,
        callGasLimit
    ]) as Hex;

    // -------------------------------------------------
    // GAS FEES (ERC-4337 v0.7)
    // layout: maxPriorityFeePerGas (16 bytes) | maxFeePerGas (16 bytes)
    // -------------------------------------------------
    const maxPriorityFeePerGas = ethers.zeroPadValue(ethers.toBeHex(1000000000n), 16); // 1 Gwei
    const maxFeePerGas = ethers.zeroPadValue(ethers.toBeHex(5000000000n), 16);         // 5 Gwei
    
    const gasFees = ethers.concat([
        maxPriorityFeePerGas,
        maxFeePerGas
    ]) as Hex;

    return {
        sender,
        nonce,
        initCode: "0x",
        callData,
        accountGasLimits,
        preVerificationGas: 50_000n,
        gasFees,
        paymasterAndData,
        signature: "0x",
    };
}