import "dotenv/config";
import { ethers } from "ethers";
import { buildUserOp } from "../userop/BuildUserOp";
import { EntryPointABI } from "../utils/ABI/EntryPointABI";

async function runAABenchmark() {
    console.log("Inizializzazione benchmark transazioni Account Abstraction...");

    // 2. Inizializza i provider
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const bundlerProvider = new ethers.JsonRpcProvider("http://localhost:3000/rpc");

    // 3. Costanti statiche
    const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
    const ACCOUNT = "0x71C95911E9a5D330f4D621842EC243EE1343292e";
    const COUNTER = "0x948B3c65b89DF0B4894ABE91E6D02FE579834F8F";

    // 4. Inizializza il Wallet
    if (!process.env.OWNER_PRIVATE_KEY) {
        throw new Error("OWNER_PRIVATE_KEY mancante nel file .env");
    }
    const wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);

    // Inizializza il contratto EntryPoint per calcolare l'hash
    const entryPointContract = new ethers.Contract(ENTRY_POINT, EntryPointABI, provider);

    // Recupera il nonce iniziale per evitare problemi di desincronizzazione
    let currentNonceBigInt = await entryPointContract.getNonce(ACCOUNT, 0);

    let count = 0;
    
    // 5. Imposta timer di 60 secondi
    const DURATION = 60000;
    const startTime = Date.now();
    const endTime = startTime + DURATION;

    console.log("Avvio del test di spam UserOperation per 60 secondi...");

    // Ciclo while basato sul timer
    while (Date.now() < endTime) {
        try {
            // 6. Crea l'operazione base usando buildUserOp
            const baseOp = await buildUserOp({
                provider,
                entryPoint: ENTRY_POINT as `0x${string}`,
                sender: ACCOUNT as `0x${string}`,
                target: COUNTER as `0x${string}`,
                data: "0xd09de08a", // Hash di increment()
            });

            // Formatta il nonce
            const currentNonceHex = "0x" + currentNonceBigInt.toString(16);

            // Struttura la packedUserOp per ERC-4337 v0.7
            // Usa i gasLimits di base generati da buildUserOp o quelli statici
            const packedUserOp: any = {
                sender: ACCOUNT,
                nonce: currentNonceHex,
                initCode: "0x",
                callData: baseOp.callData,
                accountGasLimits: "0x000000000000000000000000000186a0000000000000000000000000000493e0",
                preVerificationGas: "0xc350",
                gasFees: "0x00000000000000000000000077359400000000000000000000000002540be400",
                paymasterAndData: "0x", // Disabilitiamo il paymaster per testare la raw performance dell'AA
                signature: "0x",
            };

            // Calcola il userOpHash
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

            // Firma con il wallet dell'owner
            const signature = await wallet.signMessage(ethers.getBytes(userOpHash));
            packedUserOp.signature = signature;

            // Formatta il payload RPC
            const rpcPayload = {
                ...packedUserOp,
                callGasLimit: "0x493e0",
                verificationGasLimit: "0x186a0",
                maxFeePerGas: "0x2540be400",
                maxPriorityFeePerGas: "0x77359400"
            };

            // Invia la transazione al Bundler
            await bundlerProvider.send("eth_sendUserOperation", [rpcPayload, ENTRY_POINT]);
            
            // Incrementa il contatore delle UserOp inviate con successo
            count++;
            
            // Incrementa il nonce localmente per il prossimo giro (essenziale per velocità)
            currentNonceBigInt++;

            // 7. Mostra il progresso ogni 10 transazioni
            if (count % 10 === 0) {
                console.log(`Progresso: ${count} UserOperations inviate...`);
            }
        } catch (error: any) {
            // 8. In caso di rifiuto del bundler, stampa ed esci dal loop
            const errorMsg = error.info?.error?.message || error.message || error;
            console.error("Il Bundler ha rifiutato la UserOp o c'è stato un errore:", errorMsg);
            break;
        }
    }

    // 9. Stampa il risultato finale
    console.log(`\n==================================================================`);
    console.log(`RISULTATO ACCOUNT ABSTRACTION: ${count} UserOperations eseguite in 1 minuto`);
    console.log(`==================================================================\n`);
}

// Esegui il benchmark
runAABenchmark().catch(error => {
    console.error("Errore fatale nell'esecuzione del benchmark AA:", error);
    process.exit(1);
});
