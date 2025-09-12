# JuiceSwap V3 Deployment on Citrea Testnet

This guide provides instructions for deploying JuiceSwap V3 (Uniswap V3 fork) on Citrea Testnet.

## Prerequisites

1. **Node.js** (v14 or higher)
2. **Yarn** package manager
3. **Private key** with testnet cBTC for gas fees
4. **Owner address** to receive contract ownership

## Citrea Testnet Information

- **Chain ID**: 5115
- **RPC URL**: https://rpc.testnet.citrea.xyz
- **Explorer**: https://explorer.testnet.citrea.xyz
- **WETH9 Contract**: `0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0`
- **Native Currency**: cBTC (Citrea Bitcoin)

## Setup Instructions

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
PRIVATE_KEY=your_private_key_without_0x_prefix
OWNER_ADDRESS=address_that_will_own_the_contracts
```

**⚠️ Security Warning**: Never commit your `.env` file with real private keys!

### 3. Fund Your Deployer Account

Get testnet cBTC from the Citrea faucet for your deployer address. You'll need approximately 0.1-0.2 cBTC for the full deployment.

## Deployment Options

### Option 1: Using TypeScript Script (Recommended)

```bash
npx ts-node deploy-citrea.ts
```

### Option 2: Using Shell Script

```bash
./deploy-citrea.sh
```

### Option 3: Direct Command

```bash
npx ts-node index.ts \
  --private-key YOUR_PRIVATE_KEY \
  --json-rpc https://rpc.testnet.citrea.xyz \
  --weth9-address 0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0 \
  --native-currency-label cBTC \
  --owner-address YOUR_OWNER_ADDRESS \
  --confirmations 2
```

## Deployment Process

The deployment script will deploy the following contracts in order:

1. **V3 Core Factory** - The main factory contract for creating pools
2. **1BP Fee Tier** - Adds 0.01% fee tier support
3. **Multicall2** - Batch transaction support
4. **Proxy Admin** - Admin for upgradeable contracts
5. **Tick Lens** - Helper for reading tick data
6. **NFT Descriptor Library** - Library for NFT metadata
7. **NFT Position Descriptor** - Generates NFT metadata
8. **Transparent Proxy** - Upgradeable proxy for position descriptor
9. **Non-Fungible Position Manager** - Manages liquidity positions as NFTs
10. **V3 Migrator** - Helps migrate from V2 to V3
11. **V3 Staker** - Staking rewards contract
12. **Quoter V2** - Price quotation helper
13. **Swap Router 02** - Main routing contract for swaps
14. **Transfer Ownership** - Transfers ownership to specified address

## Monitoring Deployment

- The script saves progress to `state.json`
- If deployment fails, you can restart from the last successful step
- To start fresh, delete `state.json` before running

## Post-Deployment

After successful deployment:

1. **Verify Contracts**: Check all deployed contracts on the [Citrea Explorer](https://explorer.testnet.citrea.xyz)

2. **Important Addresses** (found in `state.json`):
   - `v3CoreFactoryAddress` - Factory for creating pools
   - `nonfungiblePositionManagerAddress` - Position manager for LPs
   - `swapRouter02Address` - Router for executing swaps
   - `quoterV2Address` - For getting quotes

3. **Save Deployment Info**: The script creates:
   - `state.json` - Complete deployment state
   - `citrea-deployment-summary.json` - Summary of key addresses

## Creating Your First Pool

After deployment, you can create pools using the factory:

1. Use the V3 Core Factory to create a pool
2. Add liquidity through the Non-Fungible Position Manager
3. Execute swaps through the Swap Router 02

## Troubleshooting

### Insufficient Funds
If you get an "insufficient funds" error, ensure your deployer address has enough cBTC for gas.

### Transaction Timeout
If transactions timeout, try:
- Increasing gas price
- Using fewer confirmations (minimum 0 for local testing)
- Checking network status on the explorer

### Partial Deployment
If deployment fails partway:
1. Check `state.json` to see completed steps
2. Fix the issue (usually gas or network related)
3. Re-run the deployment script (it will continue from last step)

## Support

For issues specific to:
- **Uniswap V3 deployment**: Check the [official repository](https://github.com/Uniswap/deploy-v3)
- **Citrea network**: Visit [Citrea documentation](https://docs.citrea.xyz)

## Gas Estimation

Full deployment typically requires:
- **Gas Used**: 30-40M gas units
- **cBTC Required**: ~0.1-0.2 cBTC (depending on gas price)

## Contract Verification

To verify contracts on Citrea Explorer, you may need to:
1. Use the contract source code from node_modules
2. Match the compiler version used (check package.json)
3. Provide constructor arguments from deployment transactions

## Next Steps

After successful deployment:

1. **Test the contracts** with small amounts first
2. **Set up a frontend** using the deployed addresses
3. **Create initial liquidity pools** for key pairs
4. **Configure any additional parameters** as needed

## License

JuiceSwap V3 is a fork of Uniswap V3. Remember that Uniswap V3 is under BUSL license. Check the [licensing requirements](https://github.com/Uniswap/v3-core#licensing) before mainnet deployment.