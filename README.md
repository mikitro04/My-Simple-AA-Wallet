# 🚀 My-Simple-AA-Wallet - Fully Local ERC-4337 (No Testnets!)

This repository demonstrates a **fully local, end-to-end ERC-4337 Account Abstraction flow**.

Everything runs on your machine:

- Build a `UserOperation`
- Sign it off-chain
- Send it to a local bundler
- Validate and execute it on-chain (anvil)
- Observe real state changes
- **Sponsor transactions with a Paymaster**

No testnets. No third-party relayers. Pure local infra.

---

## 🧠 High-level Overview

This project implements a minimal smart account with the following properties:

- A **Smart Account (SA)** deployed with an `EntryPoint`
- The **deployer becomes the owner** of the smart account
- Only the **owner’s EOA** can sign `UserOperation`s
- Signatures are verified in `validateUserOp`
- Valid operations are executed via `execute(...)`
- Ownership can be transferred to another EOA
- A **Paymaster** is available to sponsor gas fees for UserOperations.

This mirrors how real production AA wallets work, without abstractions or SDKs.

---

## 🏗️ Architecture

```
EOA (owner)
   │
   │ signUserOp (off-chain)
   ▼
PackedUserOperation
   │
   │ eth_sendUserOperation
   ▼
Bundler (local)
   │
   │ calls EntryPoint.handleOps
   ▼
EntryPoint
   │
   ├─ validatePaymasterUserOp (Paymaster)
   ├─ validateUserOp (Smart Account)
   └─ execute (Smart Account)
         │
         ▼
     Target Contract (Counter)
```

---

## 📦 Contracts

### 1. EntryPoint

- Standard ERC-4337 EntryPoint
- Deployed locally
- Used by both Smart Account and Bundler

### 2. Smart Account

- Stores `owner`
- Validates signatures in `validateUserOp`
- Executes calls via `execute(address target, uint256 value, bytes calldata data)`
- Supports ownership transfer

### 3. Counter (Target Contract)

- Simple contract with `increment()` (or `getNumber()`/`setNumber()`)
- Used to prove execution and state change

### 4. Simple Paymaster

- A custom Paymaster that approves all `UserOperation`s
- Sponsors transactions using the stake deposited in the EntryPoint

---

## 🛠️ Local Setup

This project runs **fully locally** using Anvil, Foundry, and a local ERC-4337 bundler. Follow the steps in order.

---

### 1️⃣ Clone the repository

```bash
git clone https://github.com/mikitro04/My-Simple-AA-Wallet
cd My-Simple-AA-Wallet
git submodule update --init --recursive
```

---

### 2️⃣ Install dependencies

Install root dependencies:

```bash
npm install
```

Install bundler dependencies:

```bash
cd infra/bundler
yarn install
yarn preprocess
```

---

### 3️⃣ Start Anvil

Run Anvil from root. Note that we are using chain ID `1337` to match the local bundler's default configuration.

```bash
anvil \
  --disable-code-size-limit \
  --chain-id 1337
```

---

### 4️⃣ Deploy contracts (Foundry)

Deployment order **matters**:

1. EntryPoint
2. Smart Account (MinimalAccount)
3. Counter
4. Paymaster

---

#### 4.1 Deploy EntryPoint

Use Anvil Account-1 (`0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`).

```bash
forge script script/Deploy.s.sol:DeployEntryPoint \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url anvil \
  --broadcast
```

---

#### 4.2 Deploy Smart Account

Pass the deployed EntryPoint address to the constructor.

```bash
forge create src/SmartAccount/MinimalAccount.sol:MinimalAccount \
  --broadcast \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url anvil \
  --constructor-args <ENTRY_POINT_ADDRESS>
```

The deployer becomes the **owner** of the smart account.

---

#### 4.3 Deploy Counter contract

```bash
forge script script/Deploy.s.sol:DeployCounter \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url anvil \
  --broadcast
```

---

#### 4.4 Deploy Paymaster

For the Paymaster, we use Anvil Account-0 (`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).

```bash
forge script script/Deploy.s.sol:DeployPaymaster \
  --rpc-url anvil \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

---

### 5️⃣ Verify deployed addresses

Cross-check deployed contract addresses and update them in your `src/index.ts` and `userop/runners`.

```ts
const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
const ACCOUNT = "0x71C95911E9a5D330f4D621842EC243EE1343292e";
const COUNTER = "0x948B3c65b89DF0B4894ABE91E6D02FE579834F8F";
const PAYMASTER = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
```

---

### 6️⃣ Fund the Smart Account

The smart account **must hold ETH** to pre-fund the EntryPoint (unless the Paymaster covers the gas).

```bash
cast send <SMART_ACCOUNT_ADDRESS> \
  --value 1ether \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url anvil
```

---

### 7️⃣ Fund the Paymaster & Add Stake

To sponsor transactions, the Paymaster needs funds and stake deposited in the EntryPoint.

**Deposit 1 ETH into the Paymaster:**
```bash
cast send <PAYMASTER_ADDRESS> "deposit()" \
  --value 1ether \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Add Stake (0.1 ETH) to the Paymaster:**
```bash
cast send <PAYMASTER_ADDRESS> "addStake(uint32)" 86400 \
  --value 0.1ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545
```

---

### 8️⃣ Environment variables

Create a `.env` file in the project root:

```env
OWNER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

This key is used **off-chain** to sign `PackedUserOperation`s.

---

### 9️⃣ Start the local bundler

The bundler is included as a submodule under `infra/bundler`.

Start the bundler:

```bash
cd infra/bundler
yarn run bundler \
  --unsafe \
  --auto \
  --entryPoint <ENTRY_POINT_ADDRESS>
```

> **Note**: In our setup, the EntryPoint override in the bundler codebase has been disabled to ensure it uses our deployed EntryPoint on chain ID 1337.

---

### 🔟 Run the UserOperation flow

From the project root, you can now run the Account Abstraction flow. You can choose whether to pay for the gas with the Smart Account itself, or sponsor the transaction using the Paymaster.

#### Option A: Pay with Smart Account
```bash
npm run start
```

#### Option B: Sponsor with Paymaster
```bash
npm run start -- --paymaster
```

This runs `src/index.ts` and performs the complete Account Abstraction flow:

1. Builds a `PackedUserOperation` (including `paymasterAndData` if `--paymaster` is used)
2. Computes `userOpHash` via `EntryPoint.getUserOpHash`
3. Signs the hash using the **smart account owner’s private key**
4. Converts `PackedUserOperation → RpcUserOperation` (unpacking Paymaster fields for v0.7 compatibility)
5. Sends it to the **local bundler** via `eth_sendUserOperation`
6. Bundler calls `EntryPoint.handleOps`
7. Smart Account (and optionally Paymaster) validates the signature and operation
8. Smart Account executes the call
9. `Counter.increment()` is executed and state is updated

---

## ✅ Verifying Execution

After a successful run, check the Counter value:

```bash
cast call <COUNTER_ADDRESS> "getNumber()(uint256)" --rpc-url anvil
```

The output should show the incremented number, confirming that:

- Signature validation worked
- Paymaster sponsorship succeeded (if enabled)
- Execution path is correct
- State was modified on-chain

---

## 📁 Project Structure

```
infra/
  bundler/                     # eth-infinitism/bundler (local ERC-4337 bundler)

script/
  Deploy.s.sol                 # Deploy EntryPoint, Counter, Paymaster

src/
  index.ts                     # Orchestrates full AA flow (build → sign → send)

  SmartAccount/
    MinimalAccount.sol         # ERC-4337 compatible smart account (owner-based)

  Target/
    Counter.sol                # Target contract to verify execution

  Paymaster/
    SimplePaymaster.sol        # Paymaster contract to sponsor transactions

userop/
  BuildUserOp.ts               # Constructs PackedUserOperation (nonce, calldata, gas, paymaster)
  SignUserOp.ts                # Computes userOpHash and signs it with owner key
  SendUserOp.ts                # Sends UserOp to bundler via eth_sendUserOperation

  runners/
    runBuildUserOp.ts          # Runner: build only
    runSignUserOp.ts           # Runner: build + sign
    runSendUserOp.ts           # Runner: build + sign + send

utils/
  ABI/
    EntryPointABI.ts           # ABI for EntryPoint interactions (hashing, nonce)
  UnPackUserOperation.ts       # Converts PackedUserOp → RPC UserOp format
```

---

## 🛠️ Technologies Used

| Category            | Tools                                                             |
| ------------------- | ----------------------------------------------------------------- |
| **AA Spec**         | ERC-4337 (v0.7), PackedUserOperation, EntryPoint, Paymaster       |
| **Smart Contracts** | Solidity ^0.8.24, Foundry, OpenZeppelin (ECDSA, Ownable)          |
| **Bundler**         | eth-infinitism/bundler (local, `--unsafe` Anvil mode)             |
| **Off-chain**       | TypeScript, viem@2.44.4 (RPC + signing), ethers v6 (ABI encoding) |
| **Dev Tools**       | Anvil (chainId 1337), Forge, Cast                                 |
| **Core Libs**       | `@account-abstraction/contracts`, `@openzeppelin/contracts`       |

**Design goal:** no SDKs, no wallet frameworks, only raw ERC-4337 primitives.

---

## 🔐 Mock Web3 Social Login

This project includes a simulated **Web3 Social Login** flow to demonstrate how a dApp might map a user's social identity (e.g., Google login) to a Smart Account. 

> **⚠️ Note on Simulation:** This feature is built entirely to simulate a real-world blockchain interaction in a local environment. To keep things simple, user credentials (email and password) are stored in plaintext within a local JSON database (`database/data.json`). Do not use real passwords.

### 1. How it works
You can simulate the login by running:
```bash
npm run login
```
This script will:
- Prompt for a mock email and password.
- If it's a new user, it automatically deploys a new `MinimalAccount` for them using `forge create`.
- Map the user to a local Anvil signer.
- Automatically update your `.env` file with the new user's `OWNER_PRIVATE_KEY`.

### 2. Executing a UserOperation
After logging in, your `.env` has been updated with the new Account's Private Key. To execute a UserOperation for this newly deployed Smart Account, you must explicitly pass its address to the start command:
```bash
npm run start -- --account <NEW_SMART_ACCOUNT_ADDRESS>
```
*Don't forget to fund the new Smart Account with some ETH first using `cast send`!*

### 3. Reverting back to normal (Rebase)
Since the login script modifies your `.env` file, you might want to return to the original testing environment (using Anvil Account-1). To restore the original `.env` configuration, simply run:
```bash
npm run rebase
```

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingNewFeature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingNewFeature`)
5. Open a Pull Request

**No contribution is too small!** Bug fixes, docs, tests - all welcome.

## 📄 License

MIT © [0xEunum](https://github.com/0xEunum)
