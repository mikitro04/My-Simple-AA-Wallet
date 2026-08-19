const fs = require('fs');
const path = require('path');

// La PK dell' Account-1
const DEFAULT_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

console.log("Avvio rebase dell'ambiente...");

const envPath = path.join(__dirname, '..', '.env');
const dbPath = path.join(__dirname, '..', 'database', 'data.json');

try {
    // --- 1. REBASE DEL FILE .ENV ---
    let envContent = '';
    
    // Controlliamo se il file .env esiste già, altrimenti lo creiamo
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    const regex = /OWNER_PRIVATE_KEY=".*"/;

    if (regex.test(envContent)) {
        // Se la variabile esiste, la sostituiamo
        envContent = envContent.replace(regex, `OWNER_PRIVATE_KEY="${DEFAULT_PK}"`);
    } else {
        // Se non esiste, la aggiungiamo alla fine
        envContent += `\nOWNER_PRIVATE_KEY="${DEFAULT_PK}"\n`;
    }

    // Scriviamo il risultato nel file .env
    fs.writeFileSync(envPath, envContent);
    
    console.log("Rebase del file .env completato con successo!");
    console.log(`OWNER_PRIVATE_KEY del file .env impostata su Account-1`);

    // --- 2. PULIZIA DEL FILE JSON ---
    fs.writeFileSync(dbPath, '{}', 'utf8');
    console.log("Database (database/data.json) pulito con successo!");

} catch (error) {
    console.error("Errore durante il rebase:", error.message);
}