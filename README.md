# JuiceSwap V3 Deployment

This package deploys JuiceSwap V3 - a branded fork of Uniswap V3 Protocol with cosmetic branding changes to user-facing NFT elements. All core DEX logic remains unchanged from the battle-tested Uniswap V3 codebase.

## What is JuiceSwap?

JuiceSwap V3 is functionally identical to Uniswap V3, with branding applied only to NFT position tokens that users see in their wallets and on NFT marketplaces. The concentrated liquidity AMM logic, mathematical operations, fee calculations, and security properties are 100% vanilla Uniswap V3.

**What Changed:**
- NFT name: "Uniswap V3 Positions NFT-V1" → "JuiceSwap V3 Positions NFT-V1"
- NFT symbol: "UNI-V3-POS" → "JUICE-V3-POS"
- NFT metadata: "Uniswap" text → "JuiceSwap" in descriptions and titles

**What Remains Unchanged:**
- All core AMM logic (pools, swaps, liquidity management)
- All mathematical operations and fee calculations
- All security boundaries and access controls
- All base contracts imported from official `@uniswap` packages

## Modified Contracts

JuiceSwap V3 deploys Uniswap V3 contracts with branding modifications to NFT-facing elements:

### Branding Changes

**JuiceSwapNonfungiblePositionManager.sol** (contracts/JuiceSwapNonfungiblePositionManager.sol:86)
- NFT name: `'Uniswap V3 Positions NFT-V1'` → `'JuiceSwap V3 Positions NFT-V1'`
- NFT symbol: `'UNI-V3-POS'` → `'JUICE-V3-POS'`
- Source: [Uniswap v1.3.0](https://github.com/Uniswap/v3-periphery/blob/v1.3.0/contracts/NonfungiblePositionManager.sol)

**NFTDescriptor.sol** (contracts/libraries/NFTDescriptor.sol:123, :171)
- Description text: `'...in a Uniswap V3 '` → `'...in a JuiceSwap V3 '`
- NFT name prefix: `'Uniswap - '` → `'JuiceSwap - '`
- Source: [Uniswap v1.3.0](https://github.com/Uniswap/v3-periphery/blob/v1.3.0/contracts/libraries/NFTDescriptor.sol)

**Supporting Libraries** (copied verbatim, no modifications)
- NFTSVG.sol - [Source](https://github.com/Uniswap/v3-periphery/blob/v1.3.0/contracts/libraries/NFTSVG.sol)
- HexStrings.sol - [Source](https://github.com/Uniswap/v3-periphery/blob/v1.3.0/contracts/libraries/HexStrings.sol)

All contracts include attribution headers with source URLs and commit hash `80f26c86c57b8a5e4b913f42844d4c8bd274d058`.

**Total modifications:** 4 string literals affecting NFT metadata display only.

### Unchanged Components

All core DEX logic imported from official @uniswap packages:
- UniswapV3Factory, UniswapV3Pool (from @uniswap/v3-core@1.0.0)
- SwapRouter02, QuoterV2 (from @uniswap/swap-router-contracts@1.1.0)
- All base contracts, interfaces, libraries (from @uniswap/v3-periphery@1.1.1)

For detailed implementation and maintenance instructions, see [JUICESWAP_BRANDING.md](./JUICESWAP_BRANDING.md).

## Licensing

As a derivative work of Uniswap V3, JuiceSwap is subject to the [BUSL 1.1 license](https://github.com/Uniswap/v3-core/blob/main/LICENSE). The Uniswap V3 Core license expired on April 1, 2023, converting to GPL-2.0-or-later. The periphery contracts (NonfungiblePositionManager, SwapRouter, etc.) remain under GPL-2.0-or-later.

Please ensure compliance with Uniswap's licensing terms and any chain-specific deployment grants. For new chain deployments, follow the [Uniswap Governance process](https://gov.uniswap.org/t/community-governance-process/7732) if required.

## Prerequisites

- Node.js >= 14
- Funded wallet with private key for deployment
- RPC endpoint for target network
- WETH9 contract address on target chain

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```bash
# Required
PRIVATE_KEY=0xyour_private_key_here
WETH9_ADDRESS=0x...  # WETH9 contract address on target chain
OWNER_ADDRESS=0x...   # Address that will own the deployed contracts

# Optional
NATIVE_CURRENCY_LABEL=cBTC  # Default: "cBTC"
V2_FACTORY_ADDRESS=0x...     # V2 factory for swap router (optional)
GAS_PRICE=50                 # Gas price in GWEI (optional)
```

## Usage

### Recommended: Hardhat Deployment

Deploy JuiceSwap V3 using Hardhat:

```bash
# For fresh deployment (optional - removes network-specific state files)
rm state.*.json

# Deploy to Citrea testnet
npx hardhat run scripts/deploy.ts --network citreaTestnet

# Or deploy to other networks defined in hardhat.config.ts
npx hardhat run scripts/deploy.ts --network <network-name>
```

**Benefits:**
- ✅ Configuration from `.env` and `hardhat.config.ts`
- ✅ No long CLI commands
- ✅ Better Node.js compatibility
- ✅ Standard Hardhat workflow

### Alternative: CLI Deployment

Or use the CLI directly with manual arguments:

```bash
npm start -- \
  --private-key <deployer-private-key> \
  --json-rpc <rpc-url> \
  --weth9-address <weth9-address> \
  --native-currency-label <label> \
  --owner-address <owner-address>
```

### CLI Arguments

```
Options:
  -pk, --private-key <string>               Private key used to deploy all contracts
  -j, --json-rpc <url>                      JSON RPC URL where the program should be deployed
  -w9, --weth9-address <address>            Address of the WETH9 contract on this chain
  -ncl, --native-currency-label <string>    Native currency label (e.g. "ETH", "cBTC")
  -o, --owner-address <address>             Contract address that will own the deployed artifacts
  -s, --state <path>                        Path to JSON file containing migrations state (default: "./state.{chainId}.json")
  -v2, --v2-core-factory-address <address>  V2 core factory address for swap router (optional)
  -g, --gas-price <number>                  Gas price in GWEI for each transaction (optional)
  -c, --confirmations <number>              Confirmations to wait after each transaction (default: "2")
  -V, --version                             Output version number
  -h, --help                                Display help
```

### Deployment Steps

The deployment executes these migrations in order:

1. **UniswapV3Factory** - Core factory for creating pools
2. **Fee tier setup** - Enable 1 basis point fee tier
3. **Multicall2** - Batch transaction execution
4. **ProxyAdmin** - Proxy administration
5. **TickLens** - Read tick data
6. **JuiceSwap NFTDescriptor Library** - Branded NFT metadata generation
7. **NonfungibleTokenPositionDescriptor** - Links descriptor library
8. **TransparentUpgradeableProxy** - Upgradeable descriptor proxy
9. **JuiceSwap NonfungiblePositionManager** - Branded NFT position manager
10. **V3Migrator** - Migrate from V2 positions
11. **V3Staker** - Liquidity mining
12. **QuoterV2** - Quote exact output amounts
13. **SwapRouter02** - Execute swaps with advanced features
14. **Ownership transfers** - Transfer admin rights to owner

### State Management

Migration state is saved in network-specific files: `state.{network}.json` (e.g., `state.localhost.json`, `state.citreaTestnet.json`). This allows resuming interrupted deployments and managing multiple network deployments simultaneously.

**For fresh deployment:** Delete the network-specific state file (e.g., `rm state.citreaTestnet.json`) before running.

**To resume deployment:** Keep the state file and re-run the command - deployment will continue from the last completed step.

### Gas Estimates

Expect **30-40M gas** for full deployment (14 transactions).

### Confirmations

Set `--confirmations 0` for networks that only mine blocks when transactions are queued (e.g., local testnets).

For production networks, use `--confirmations 2` (default) or higher.

## Development

### Compile Contracts

```bash
npx hardhat compile
```

Contracts are compiled with Solidity 0.7.6 and optimizer enabled (1,000,000 runs) to match Uniswap production settings.

### Run Tests

```bash
npm test
```

### Verify Contracts

After deployment, verify contracts on block explorers:

```bash
npx hardhat verify --network <network> <contract-address> <constructor-args>
```

The deployment addresses are saved in network-specific state files (e.g., `state.citreaTestnet.json`).

### Full Ecosystem Integration Test

Test the complete JUICE ecosystem (JUSD Protocol + JuiceSwap DEX + Governance) on localhost:

```bash
# Terminal 1: Start local Hardhat node
npx hardhat node

# Terminal 2: Run full ecosystem test
npm run test:ecosystem
```

**What it tests:**
- JUSD Protocol deployment (stablecoin + JUICE equity token)
- JuiceSwap DEX deployment (Factory, Router, PositionManager)
- Governance deployment (Governor + FeeCollector)
- Ownership transfer verification
- Pool creation (JUICE/JUSD)
- Liquidity provision
- Swap execution

Results saved to `/tmp/ecosystem-test.log`.

**Folder Structure:**

The integration test uses production deployment scripts from external repositories. Default folder structure:

```
JuiceSwapXyz/
├── JuiceDollar/
│   └── smartContracts/          # JUSD deployment scripts
├── deploy-v3/                    # This repo (JuiceSwap DEX)
└── smart-contracts/              # Governance deployment scripts
```

**Path Overrides:**

If your folder structure differs, override paths in `.env`:

```bash
# Optional: Override integration test repo paths
JUSD_REPO_PATH=/path/to/JuiceDollar/smartContracts
GOVERNANCE_REPO_PATH=/path/to/JuiceSwap/smart-contracts
```

See `.env.example` for complete configuration options.

## Security Audit

**Audit Risk: ZERO**

The branding modifications are cosmetic string literals only. They do not affect:
- Smart contract execution logic
- State transitions or storage
- Mathematical calculations
- Fee mechanisms
- Security boundaries
- Access controls

JuiceSwap inherits all security properties from Uniswap V3, which has:
- Multiple professional security audits
- $100B+ total value locked (TVL) historically
- 3+ years of battle-testing in production

## Verification

After deployment, verify the branding:

```javascript
// NFT Collection Name
await nonfungiblePositionManager.name()
// Returns: "JuiceSwap V3 Positions NFT-V1"

// NFT Symbol
await nonfungiblePositionManager.symbol()
// Returns: "JUICE-V3-POS"

// NFT Metadata (decode base64)
const tokenURI = await nonfungiblePositionManager.tokenURI(tokenId)
// Description contains "JuiceSwap V3"
// Name starts with "JuiceSwap -"
```

## FAQs

### Why fork Uniswap V3?

JuiceSwap provides chain-specific branding for user-facing elements while maintaining 100% compatibility with the proven Uniswap V3 codebase. This approach minimizes security risk while enabling brand differentiation.

### Can I verify the contracts match Uniswap?

Yes! All modified contracts include headers with:
- Source URL pointing to exact Uniswap v1.3.0 files
- Commit hash (80f26c86c57b8a5e4b913f42844d4c8bd274d058)
- Line-by-line documentation of all changes

Compare the contracts directly on GitHub to verify only branding strings changed.

### Will this work with existing Uniswap tooling?

Yes! JuiceSwap is ABI-compatible with Uniswap V3. Frontend interfaces, SDKs, and tools designed for Uniswap V3 will work with JuiceSwap with only configuration changes (contract addresses).

### What about upgrades?

The NonfungibleTokenPositionDescriptor is deployed behind a TransparentUpgradeableProxy, allowing metadata updates via governance (owner address). Core pool contracts are immutable, exactly like Uniswap.

### How do I get support?

File issues in this repository or consult the [Uniswap V3 documentation](https://docs.uniswap.org/protocol/introduction) for protocol-level questions.

## Repository Structure

```
deploy-v3/
├── contracts/
│   ├── JuiceSwapNonfungiblePositionManager.sol  (Modified)
│   └── libraries/
│       ├── NFTDescriptor.sol                     (Modified)
│       ├── NFTSVG.sol                           (Copied)
│       └── HexStrings.sol                       (Copied)
├── src/
│   ├── deploy.ts                                (Deployment orchestration)
│   └── steps/                                   (Individual deployment steps)
├── artifacts/                                   (Compiled contracts)
├── state.{network}.json                         (Network-specific deployment state)
└── hardhat.config.ts                           (Compiler configuration)
```

## References

- [Uniswap V3 Documentation](https://docs.uniswap.org/protocol/introduction)
- [Uniswap V3 Core Repository](https://github.com/Uniswap/v3-core)
- [Uniswap V3 Periphery Repository](https://github.com/Uniswap/v3-periphery)
- [Original Deploy Script](https://github.com/Uniswap/deploy-v3)

## License

Modified contracts inherit their licenses from Uniswap V3:
- Core contracts (Factory, Pool): GPL-2.0-or-later (BUSL expired April 1, 2023)
- Periphery contracts: GPL-2.0-or-later
- NFTDescriptor library: UNLICENSED
- Supporting libraries: MIT / GPL-2.0-or-later

All modifications are minimal branding changes only. See contract headers for complete attribution.
