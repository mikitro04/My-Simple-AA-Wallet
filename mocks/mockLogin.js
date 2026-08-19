const readline = require('readline');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Chiave privata dell'Account-9 di Anvil
const ANVIL_ACCOUNT_9_PK = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";

// Percorsi dei file
const envPath = path.join(__dirname, '..', '.env');
const dbPath = path.join(__dirname, '..', 'database', 'data.json');

// Funzione helper per leggere il file JSON
function readDatabase() {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return data.trim() === '' ? {} : JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Funzione helper per salvare nel file JSON
function saveToDatabase(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 4), 'utf8');
}

// Funzione per stampare il risultato finale
function finishProcess(email, deployedAddress) {
    console.log("[5/5] Processo completato.\n");
    console.log("==========================================");
    console.log("DATI DELL'ACCOUNT WEB3 E DELLO SMART CONTRACT");
    console.log("==========================================");
    console.log(`Email associata: ${email}`);
    console.log(`Smart Account Address: ${deployedAddress}`);
    console.log("==========================================\n");
    console.log("Il tuo file .env ora contiene la Private Key dell'Account dell'utente.");
}

// Funzione per gestire la password in modo sicuro con asterischi
function askPassword(query, callback) {
    process.stdout.write(query);
    let password = '';
    
    const onData = (c) => {
        const char = c.toString();
        switch (char) {
            case '\n':
            case '\r':
            case '\u0004': // Invio
                process.stdout.write('\n');
                process.stdin.setRawMode(false);
                process.stdin.removeListener('data', onData);
                process.stdin.pause();
                callback(password);
                break;
            case '\u0003': // Ctrl+C
                process.stdout.write('\n');
                process.exit();
                break;
            case '\b':
            case '\x7f': // Backspace
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    process.stdout.write('\b \b');
                }
                break;
            default:
                if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
                    password += char;
                    process.stdout.write('*');
                }
                break;
        }
    };
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
}

console.log("==========================================");
console.log("   MOCK WEB3 SOCIAL LOGIN (Anvil Test)    ");
console.log("==========================================\n");

rl.question('Inserisci email Google: ', (email) => {
    
    rl.close(); 
    
    askPassword('Inserisci password: ', (password) => {
        
        console.log("\n[1/5] Contatto i server di Google...");
        
        setTimeout(() => {
            // --- VERIFICA AUTENTICAZIONE ---
            const db = readDatabase();

            if (db[email]) {
                if (typeof db[email] === 'string' || db[email].password !== password) {
                    console.log("\nERRORE AUTENTICAZIONE: Password errata!");
                    console.log("   Processo interrotto.\n");
                    process.exit(1); // Esce con errore
                }
            }

            console.log("[2/5] Autenticazione riuscita. Mapping sul Signer di Anvil in corso...");
            
            const signer = new ethers.Wallet(ANVIL_ACCOUNT_9_PK);
            
            console.log("[3/5] Signer assegnato con successo! Aggiornamento file .env...");
            
            try {
                let envContent = fs.readFileSync(envPath, 'utf8');
                const regex = /OWNER_PRIVATE_KEY=".*"/;
                
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, `OWNER_PRIVATE_KEY="${signer.privateKey}"`);
                } else {
                    envContent += `\nOWNER_PRIVATE_KEY="${signer.privateKey}"\n`;
                }
                
                fs.writeFileSync(envPath, envContent);
                console.log("      File .env aggiornato correttamente.");
            } catch (error) {
                console.error("      Errore durante l'aggiornamento del file .env:", error.message);
            }
            
            // --- LOGICA DEPLOY O RECUPERO ---
            if (db[email]) {
                console.log("\n[4/5] Email trovata nel database. Deploy ignorato.");
                console.log("      Recupero dello Smart Account esistente...");
                
                const deployedAddress = db[email].address;
                finishProcess(email, deployedAddress);
                
            } else {
                console.log("\n[4/5] Email nuova. Esecuzione deploy dello Smart Account...");
                const deployCmd = `forge create src/SmartAccount/MinimalAccount.sol:MinimalAccount --broadcast --private-key ${ANVIL_ACCOUNT_9_PK} --rpc-url http://127.0.0.1:8545 --constructor-args 0x8464135c8F25Da09e49BC8782676a84730C318bC`;
                
                exec(deployCmd, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
                    if (error) {
                        console.error("      Errore durante il deploy:", error.message);
                        console.error(stderr);
                        process.exit(1);
                    }

                    let deployedAddress = "Non trovato";
                    const match = stdout.match(/Deployed to: (0x[a-fA-F0-9]{40})/);
                    if (match) {
                        deployedAddress = match[1];
                        
                        db[email] = {
                            address: deployedAddress,
                            password: password
                        };
                        saveToDatabase(db);
                        console.log("      Deploy completato e credenziali salvate nel database!\n");
                    } else {
                        console.log("      Deploy eseguito, ma impossibile estrarre l'indirizzo dall'output.\n");
                    }
                    
                    finishProcess(email, deployedAddress);
                });
            }
            
        }, 1500); 
    });
});