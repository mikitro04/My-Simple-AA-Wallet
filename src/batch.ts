import "dotenv/config";
import { buildUserOp } from "../userop/BuildUserOp";
import { ethers } from "ethers";
import { EntryPointABI } from "../utils/ABI/EntryPointABI";

async function main() {
	const args = process.argv.slice(2);

	const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
	
	// 1. Indirizzo del Mittente (Smart Account)
	let ACCOUNT: `0x${string}` = "0x71C95911E9a5D330f4D621842EC243EE1343292e";
	const accountIndex = args.indexOf("--account");
	if (accountIndex !== -1 && args.length > accountIndex + 1) {
		ACCOUNT = args[accountIndex + 1] as `0x${string}`;
	}

	// 2. Indirizzo di Destinazione (Vault)
	const TARGET = "0xbCF26943C0197d2eE0E5D05c716Be60cc2761508";

	const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
	const bundlerProvider = new ethers.JsonRpcProvider("http://localhost:3000/rpc");

	const wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY!, provider);
	console.log("Wallet signer:", wallet.address);

	// 4. Interfaccia Ethers per il Vault
	const vaultIface = new ethers.Interface([
		"function deposit() payable", 
		"function withdraw(uint256 amount)"
	]);

	// 5. Preparazione dei tre array per executeBatch (3 operazioni: Deposito, Prelievo, Deposito)
	const targets = [TARGET, TARGET, TARGET];
	const values = [
		ethers.parseEther("0.5"),
		0n, // Zero value per il prelievo
		ethers.parseEther("0.5")
	];
	const calldatas = [
		vaultIface.encodeFunctionData("deposit"),
		vaultIface.encodeFunctionData("withdraw", [ethers.parseEther("0.5")]),
		vaultIface.encodeFunctionData("deposit")
	];

	// 6. Interfaccia del MinimalAccount per codificare la chiamata executeBatch
	const accountIface = new ethers.Interface([
		"function executeBatch(address[] calldata _targets, uint256[] calldata _values, bytes[] calldata _calldatas)"
	]);
	
	const batchCallData = accountIface.encodeFunctionData("executeBatch", [
		targets,
		values,
		calldatas
	]);

	// 7. Costruzione della UserOperation base (per nonce e parametri standard)
	const baseOp: any = await buildUserOp({
		provider,
		entryPoint: ENTRY_POINT,
		sender: ACCOUNT,
		target: ACCOUNT, 
		data: "0x", // Non ci interessa perché lo sovrascriveremo
	});

	const currentNonce = "0x" + BigInt(baseOp.nonce).toString(16);
	console.log("Current Nonce from blockchain:", currentNonce);

	// 8. Logica inalterata per UserOperation (v0.7), ma INIETTIAMO il batchCallData puro!
	const packedUserOp: any = {
		sender: ACCOUNT,
		nonce: currentNonce,
		initCode: baseOp.initCode || "0x",
		callData: batchCallData as `0x${string}`, // OVERRIDE DIRETTO! Evita che venga wrappato in execute()
		accountGasLimits: "0x000000000000000000000000000186a0000000000000000000000000000493e0",
		preVerificationGas: "0xc350",
		gasFees: "0x00000000000000000000000077359400000000000000000000000002540be400",
		paymasterAndData: baseOp.paymasterAndData || "0x",
		signature: "0x",
	};

	// --- GESTIONE PAYMASTER ---
	const USE_PAYMASTER = args.includes("--paymaster");

	if (!USE_PAYMASTER) {
		console.log("Paymaster NON richiesto da parametro CLI. Lo Smart Account pagherà il proprio gas.");
		packedUserOp.paymasterAndData = "0x";
	} else {
		console.log("Paymaster abilitato da CLI (--paymaster). Il Paymaster sponsorizzerà la transazione.");
	}

	const entryPointContract = new ethers.Contract(ENTRY_POINT, EntryPointABI, provider);

	const userOpHash = await entryPointContract.getUserOpHash({
		sender: packedUserOp.sender,
		nonce: packedUserOp.nonce,
		initCode: packedUserOp.initCode,
		callData: packedUserOp.callData,
		accountGasLimits: packedUserOp.accountGasLimits,
		preVerificationGas: packedUserOp.preVerificationGas,
		gasFees: packedUserOp.gasFees,
		paymasterAndData: packedUserOp.paymasterAndData,
		signature: "0x",
	});

	console.log("\nUserOpHash:", userOpHash);

	// Firma dell'owner
	const signature = await wallet.signMessage(ethers.getBytes(userOpHash));
	packedUserOp.signature = signature;

	console.log("Signature:", signature);
	console.log("\nUserOp firmata con successo!");

	const rpcPayload: any = {
		...packedUserOp,
		callGasLimit: "0x493e0",
		verificationGasLimit: "0x186a0",
		maxFeePerGas: "0x2540be400",
		maxPriorityFeePerGas: "0x77359400"
	};

	// IL BUNDLER v0.7 RICHIEDE I CAMPI DEL PAYMASTER "SPACCHETTATI" NEL JSON RPC
	if (USE_PAYMASTER && packedUserOp.paymasterAndData !== "0x") {
		rpcPayload.paymaster = ethers.dataSlice(packedUserOp.paymasterAndData, 0, 20);

		const paymasterVerificationGasLimitHex = ethers.dataSlice(packedUserOp.paymasterAndData, 20, 36);
		rpcPayload.paymasterVerificationGasLimit = "0x" + BigInt(paymasterVerificationGasLimitHex).toString(16);

		const paymasterPostOpGasLimitHex = ethers.dataSlice(packedUserOp.paymasterAndData, 36, 52);
		rpcPayload.paymasterPostOpGasLimit = "0x" + BigInt(paymasterPostOpGasLimitHex).toString(16);

		rpcPayload.paymasterData = ethers.dataSlice(packedUserOp.paymasterAndData, 52);
	}

	console.log("\nInvio dell'operazione al Bundler...");

	try {
		const txHash = await bundlerProvider.send("eth_sendUserOperation", [rpcPayload, ENTRY_POINT]);
		console.log("\nSUCCESS! Il Bundler ha accettato la UserOp. Hash:", txHash);
	} catch (error: any) {
		console.error("\nIl Bundler ha rifiutato la UserOp:", error.info?.error?.message || error.message);
	}
}

main().catch(console.error);
