import { ethers } from "ethers";

async function runBenchmark() {
    console.log("Inizializzazione benchmark transazioni native (EOA -> EOA)...");

    // 1. Inizializza il provider JSON-RPC che punta ad Anvil
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    // 2. Inizializza il Wallet con la chiave privata statica (Account-1 di Anvil)
    const privateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Mittente: ${wallet.address}`);

    // 3. Imposta il bersaglio (Account-2) e l'importo
    const targetAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    const amount = ethers.parseEther("0.001");
    console.log(`Bersaglio: ${targetAddress}`);

    // 5. Ottimizzazione: recupera il nonce iniziale una sola volta
    let currentNonce = await wallet.getNonce();
    console.log(`Nonce iniziale: ${currentNonce}`);

    let count = 0;
    
    // 4. Imposta un timer di 60 secondi
    const DURATION = 60000; // 60000 millisecondi = 60 secondi
    const startTime = Date.now();
    const endTime = startTime + DURATION;

    console.log("Avvio del test di spam transazioni per 60 secondi...");

    // Esegui lo spam di transazioni finché il timer non scade
    while (Date.now() < endTime) {
        try {
            // Crea e invia la transazione passando esplicitamente il nonce
            const txResponse = await wallet.sendTransaction({
                to: targetAddress,
                value: amount,
                nonce: currentNonce
            });

            // 6. Attendi la conferma della transazione
            await txResponse.wait();
            
            // Incrementa il contatore delle transazioni completate con successo
            count++;
            
            // Incrementa manualmente il nonce per la transazione successiva
            currentNonce++;

            // 7. Mostra il progresso ogni 100 transazioni
            if (count % 100 === 0) {
                console.log(`Progresso: ${count} transazioni eseguite...`);
            }
        } catch (error) {
            console.error("Errore durante l'invio della transazione:", error);
            // Se c'è un errore grave sul nonce o altro, potremmo recuperarlo di nuovo,
            // ma in ambiente Anvil con auto-mine solitamente non è necessario.
        }
    }

    // 8. Stampa il risultato finale
    console.log(`\n========================================================`);
    console.log(`RISULTATO NATIVO: ${count} transazioni eseguite in 1 minuto`);
    console.log(`========================================================\n`);
}

// Esegui il benchmark
runBenchmark().catch(error => {
    console.error("Errore fatale nell'esecuzione del benchmark:", error);
    process.exit(1);
});
