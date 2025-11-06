# JuiceSwap V3 Branding Implementation

## Overview

This repository deploys Uniswap V3 contracts with JuiceSwap branding on user-facing NFT elements while keeping all core DEX logic unchanged.

## Modified Contracts

### 1. JuiceSwapNonfungiblePositionManager.sol
**Location:** `contracts/JuiceSwapNonfungiblePositionManager.sol`

**Source:** Uniswap V3 Periphery v1.3.0

**Changes:**
- Line 86: NFT name changed from `'Uniswap V3 Positions NFT-V1'` to `'JuiceSwap V3 Positions NFT-V1'`
- Line 86: NFT symbol changed from `'UNI-V3-POS'` to `'JUICE-V3-POS'`

**Impact:** Users will see "JuiceSwap V3 Positions NFT-V1" in their wallets (MetaMask, Rainbow, etc.) and on NFT marketplaces (OpenSea, etc.)

### 2. NFTDescriptor.sol (Library)
**Location:** `contracts/libraries/NFTDescriptor.sol`

**Source:** Uniswap V3 Periphery v1.3.0

**Changes:**
- Line 123: Description text changed from `'...in a Uniswap V3 '` to `'...in a JuiceSwap V3 '`
- Line 171: NFT title prefix changed from `'Uniswap - '` to `'JuiceSwap - '`

**Impact:** NFT metadata will display JuiceSwap branding in descriptions and titles

### 3. Supporting Libraries (Unchanged)
**Location:** `contracts/libraries/`

- `NFTSVG.sol` - SVG generation (no changes)
- `HexStrings.sol` - Hex string utilities (no changes)

These are copied from Uniswap V3 Periphery v1.3.0 without modifications as they contain no branding.

## What Remains Vanilla Uniswap

All other contracts are imported from official @uniswap packages:

- ✅ UniswapV3Factory (from @uniswap/v3-core@1.0.0)
- ✅ UniswapV3Pool (from @uniswap/v3-core@1.0.0)
- ✅ SwapRouter02 (from @uniswap/swap-router-contracts@1.1.0)
- ✅ QuoterV2 (from @uniswap/swap-router-contracts@1.1.0)
- ✅ All base contracts (from @uniswap/v3-periphery@1.1.1)
- ✅ All interfaces (from @uniswap/v3-periphery@1.1.1)
- ✅ All other libraries (from @uniswap/v3-periphery@1.1.1)

## Deployment

### Using JuiceSwap-Branded Contracts

The deployment script `src/steps/deploy-nonfungible-position-manager-juiceswap.ts` deploys the branded NonfungiblePositionManager.

To use in deployment:
```typescript
import { DEPLOY_NONFUNGIBLE_POSITION_MANAGER_JUICESWAP } from './steps/deploy-nonfungible-position-manager-juiceswap'
```

### Compilation

Contracts are compiled with the same settings as Uniswap V3:

```javascript
solidity: {
  version: "0.7.6",
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000000,
    },
  },
}
```

To compile:
```bash
npx hardhat compile
```

Artifacts are generated in `artifacts/contracts/`:
- `JuiceSwapNonfungiblePositionManager.sol/JuiceSwapNonfungiblePositionManager.json`
- `libraries/NFTDescriptor.sol/NFTDescriptor.json`

## Audit Considerations

### Changes Are Cosmetic Only

**What Changed:**
- 4 string literals (NFT name, symbol, and metadata text)

**What Did NOT Change:**
- Core AMM logic (100% vanilla Uniswap)
- Position tracking logic (100% vanilla Uniswap)
- Fee calculations (100% vanilla Uniswap)
- Liquidity management (100% vanilla Uniswap)
- Security boundaries (100% vanilla Uniswap)
- All mathematical operations (100% vanilla Uniswap)

### Audit Risk: ZERO

These are pure display strings that don't affect:
- Smart contract execution
- State transitions
- Mathematical calculations
- Security properties
- Fee logic
- Position management

The changes are equivalent to changing CSS in a web application - they affect appearance only.

## File Structure

```
deploy-v3/
├── contracts/
│   ├── JuiceSwapNonfungiblePositionManager.sol  (modified)
│   └── libraries/
│       ├── NFTDescriptor.sol                     (modified)
│       ├── NFTSVG.sol                           (unchanged)
│       └── HexStrings.sol                       (unchanged)
├── src/steps/
│   ├── deploy-nonfungible-position-manager-juiceswap.ts
│   └── deploy-juiceswap-nft-descriptor-library.ts
└── artifacts/
    └── contracts/
        ├── JuiceSwapNonfungiblePositionManager.sol/
        └── libraries/
            └── NFTDescriptor.sol/
```

## Verification

After deployment, verify branding by:

1. **Check NFT Collection Name:**
   - Call `name()` on NonfungiblePositionManager
   - Should return: "JuiceSwap V3 Positions NFT-V1"

2. **Check NFT Symbol:**
   - Call `symbol()` on NonfungiblePositionManager
   - Should return: "JUICE-V3-POS"

3. **Check NFT Metadata:**
   - Call `tokenURI(tokenId)` on NonfungiblePositionManager
   - Decode the base64 data
   - Verify description contains "JuiceSwap V3"
   - Verify name starts with "JuiceSwap - "

## Maintenance

### Updating to New Uniswap Version

If Uniswap releases a security patch:

1. Clone the new version:
   ```bash
   git clone --depth 1 --branch vX.X.X https://github.com/Uniswap/v3-periphery.git /tmp/v3-periphery
   ```

2. Copy contracts and reapply branding:
   ```bash
   cp /tmp/v3-periphery/contracts/NonfungiblePositionManager.sol contracts/JuiceSwapNonfungiblePositionManager.sol
   # Edit line 75 to restore JuiceSwap branding

   cp /tmp/v3-periphery/contracts/libraries/NFTDescriptor.sol contracts/libraries/
   # Edit lines 115 and 163 to restore JuiceSwap branding
   ```

3. Recompile and test:
   ```bash
   npx hardhat compile
   npm test
   ```

## License

Modified contracts inherit their licenses from Uniswap V3:
- JuiceSwapNonfungiblePositionManager: GPL-2.0-or-later
- NFTDescriptor: UNLICENSED

All modifications are minimal branding changes only.
