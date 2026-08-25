
# My-Simple-AA-Wallet - Fully Local ERC-4337 Sandbox

![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.24-363636?style=flat-square&logo=solidity)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=flat-square&logo=typescript)
![Foundry](https://img.shields.io/badge/Foundry-Anvil-FF0000?style=flat-square)
![ERC-4337](https://img.shields.io/badge/ERC--4337-v0.7-blue?style=flat-square)

This repository demonstrates a **fully local, end-to-end ERC-4337 Account Abstraction flow**.

Everything runs directly on your machine. No testnets, no third-party relayers, just pure local infrastructure.

## Key Features
- **End-to-End AA Flow:** Build, sign (off-chain), send, and validate `UserOperation`s locally.
- **Gas Sponsorship:** Fully functional `Paymaster` to sponsor transaction fees for users.
- **Atomic Batch Execution:** Execute multiple calls (e.g., DeFi deposits/withdrawals) in a single `UserOperation`.
- **Web3 Social Login Simulation:** A mock environment demonstrating how to map traditional Web2 credentials (email/password) to a seamlessly deployed Smart Account.

---

## High-level Overview

This project implements a minimal, yet realistic, smart account architecture:
- A **Smart Account (SA)** deployed via an `EntryPoint`.
- The **deployer becomes the owner** of the smart account.
- Only the **owner’s EOA** can sign `UserOperation`s.
- Signatures are strictly verified in `validateUserOp`.
- Valid operations are executed via `execute(...)` or `executeBatch(...)`.

This mirrors how real production AA wallets work under the hood, without hiding the complexity behind external SDKs.

---

## Architecture
```text
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
   ├─ validatePaymasterUserOp (SimplePaymaster)
   ├─ validateUserOp (Smart Account)
   └─ execute / executeBatch (Smart Account)
         │
         ├─► Target Contract 1 (Counter)
         └─► Target Contract 2 (DeFi Vault)
```

---

## Contracts

1. **EntryPoint:** Standard ERC-4337 EntryPoint (v0.7), deployed locally and used by both the Smart Account and the Bundler.
2. **Smart Account (`MinimalAccount.sol`):** Stores the `owner`, validates signatures, and executes single or batch calls.
3. **Simple Paymaster:** A custom Paymaster that approves all `UserOperation`s, sponsoring transactions using the stake deposited in the EntryPoint.
4. **Counter:** A simple target contract with an `increment()` function to prove execution state changes.
5. **Vault:** A mock DeFi target contract used to demonstrate atomic batch executions (`deposit` and `withdraw`).

---

## Local Setup

This project runs **fully locally** using Anvil, Foundry, and a local ERC-4337 bundler. Follow the steps in order.

### 1. Clone the repository
```bash
git clone [https://github.com/mikitro04/My-Simple-AA-Wallet](https://github.com/mikitro04/My-Simple-AA-Wallet)
cd My-Simple-AA-Wallet
git submodule update --init --recursive
```

### 2. Install dependencies

Install root dependencies:
```bash
npm install
```

Install bundler dependencies:
```bash
cd infra/bundler
yarn install
yarn preprocess
cd ../..
```

### 3. Start Anvil

Run Anvil from the root. Note that we are using chain ID `1337` to match the local bundler's default configuration.
```bash
anvil \
  --disable-code-size-limit \
  --chain-id 1337
```

### 4. Deploy contracts (Foundry)

Open a new terminal. Deployment order **matters**.

**4.1 Deploy EntryPoint** (Uses Anvil Account-1)
```bash
forge script script/Deploy.s.sol:DeployEntryPoint \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545) \
  --broadcast
```

**4.2 Deploy Smart Account**
*Pass the deployed EntryPoint address to the constructor.*
```bash
forge create src/SmartAccount/MinimalAccount.sol:MinimalAccount \
  --broadcast \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545) \
  --constructor-args <ENTRY_POINT_ADDRESS>
```

**4.3 Deploy Counter Contract**
```bash
forge script script/Deploy.s.sol:DeployCounter \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545) \
  --broadcast
```

**4.4 Deploy Paymaster** (Uses Anvil Account-0)
```bash
forge script script/Deploy.s.sol:DeployPaymaster \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545) \
  --broadcast
```

**4.5 Deploy Vault Contract** (For Batch Testing)
```bash
forge create src/Target/Vault.sol:Vault \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545) \
  --broadcast
```

---

### 5. Verify deployed addresses

Cross-check deployed contract addresses and update them in your `src/index.ts`, `src/batch.ts`, and `userop/runners`.
```ts
const ENTRY_POINT = "0x8464...
const ACCOUNT     = "0x71C9...
const COUNTER     = "0x948B...
const PAYMASTER   = "0x5FbD...
const VAULT       = "0xbCF2...
```

---

### 6. Fund the Smart Account

The smart account **must hold ETH** to pre-fund the EntryPoint (unless the Paymaster covers the gas).
```bash
cast send <SMART_ACCOUNT_ADDRESS> \
  --value 5ether \
  --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545)
```

---

### 7. Fund the Paymaster & Add Stake

To sponsor transactions, the Paymaster needs funds and stake deposited in the EntryPoint.

**Deposit 1 ETH into the Paymaster:**
```bash
cast send <PAYMASTER_ADDRESS> "deposit()" \
  --value 1ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545)
```

**Add Stake (0.1 ETH) to the Paymaster:**
```bash
cast send <PAYMASTER_ADDRESS> "addStake(uint32)" 86400 \
  --value 0.1ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545)
```

---

### 8. Environment variables

Create a `.env` file in the project root. This key is used **off-chain** to sign `PackedUserOperation`s.
```env
OWNER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

---

### 9. Start the local bundler

The bundler is included as a submodule. Open a new terminal and run:
```bash
cd infra/bundler
yarn run bundler \
  --unsafe \
  --auto \
  --entryPoint <ENTRY_POINT_ADDRESS>
```

> **Note**: In our setup, the EntryPoint override in the bundler codebase has been disabled to ensure it strictly uses our deployed EntryPoint on chain ID 1337.

---

### 10. Run the UserOperation flows

From the project root, you can now run various Account Abstraction flows.

#### Standard Execution (Counter Increment)

You can choose whether to pay for the gas with the Smart Account itself, or sponsor the transaction using the Paymaster.
```bash
# Option A: Pay with Smart Account
npm run start

# Option B: Sponsor with Paymaster
npm run start -- --paymaster
```

#### Atomic Batch Execution (DeFi Vault)

This executes a `deposit`, a `withdraw`, and another `deposit` in a single `UserOperation`, ensuring atomicity.
```bash
npm run batch
```

---

## Mock Web3 Social Login

This project includes a simulated **Web3 Social Login** flow to demonstrate how a dApp maps a user's social identity (e.g., Google login) to a Smart Account.

> **Note on Simulation:** This feature simulates a real-world blockchain interaction locally. User credentials are stored in plaintext within a local JSON database (`database/data.json`). **Do not use real passwords.**

**1. Login & Auto-Deploy**
```bash
npm run login
```

If it's a new user, it automatically deploys a new `MinimalAccount` for them and updates your `.env` file with the new user's `OWNER_PRIVATE_KEY`.

**2. Execute with new Account**
To execute a UserOperation with this newly deployed Smart Account, pass its address to the start command:
```bash
npm run start -- --account <NEW_SMART_ACCOUNT_ADDRESS>
```

*(Don't forget to fund the new Smart Account with ETH first!)*

**3. Reverting back to normal (Rebase)**
To wipe the mock database and restore the original `.env` configuration (Anvil Account-1), simply run:
```bash
npm run rebase
```

---

## Verifying Execution

After a successful run, check the states using Cast:

**Check Counter:**
```bash
cast call <COUNTER_ADDRESS> "getNumber()(uint256)" --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545)
```

**Check Vault Balance (Batch Testing):**
```bash
cast call <VAULT_ADDRESS> "balances(address)(uint256)" <SMART_ACCOUNT_ADDRESS> --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545)
```

---

## Technologies Used

| Category | Tools |
| --- | --- |
| **AA Spec** | ERC-4337 (v0.7), PackedUserOperation, EntryPoint, Paymaster |
| **Smart Contracts** | Solidity ^0.8.24, Foundry, OpenZeppelin |
| **Bundler** | eth-infinitism/bundler (local, `--unsafe` Anvil mode) |
| **Off-chain** | TypeScript, Node.js, ethers v6 (ABI encoding) |
| **Dev Tools** | Anvil (chainId 1337), Forge, Cast |

**Design goal:** Understand the core mechanics of Account Abstraction by avoiding high-level SDKs and working directly with raw ERC-4337 primitives and JSON-RPC payloads.

---

## License

MIT © [mikitro04](https://github.com/mikitro04)