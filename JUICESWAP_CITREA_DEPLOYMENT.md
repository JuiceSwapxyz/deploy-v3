# JuiceSwap V2 + V3 - Citrea Testnet Deployment

## Deployment Information

**Deployment Date:** 2025-12-10
**Network:** Citrea Testnet (Chain ID: 5115)
**Deployer:** 0xE399782Fe2B0aBb138926b14261F49473b4881A3
**Block Number:** 19289966

## Deployed Contract Addresses

### V2 Contracts
- **V2 Factory:** [`0x81b159FE82d8ECC8ff4801BB687166972dF3f144`](https://explorer.testnet.citrea.xyz/address/0x81b159FE82d8ECC8ff4801BB687166972dF3f144)
- **V2 Router 02:** [`0x48bA9db1EAcDB7C97B7B601c1E213F29E996d974`](https://explorer.testnet.citrea.xyz/address/0x48bA9db1EAcDB7C97B7B601c1E213F29E996d974)

### V3 Core Contracts
- **V3 Core Factory:** [`0x9136D17Ec096AAd031D442a796cd5984128cF0b2`](https://explorer.testnet.citrea.xyz/address/0x9136D17Ec096AAd031D442a796cd5984128cF0b2)
- **Position Manager:** [`0x56D63E0F763b29F62bb7242420d028F86e9402E1`](https://explorer.testnet.citrea.xyz/address/0x56D63E0F763b29F62bb7242420d028F86e9402E1)
- **Swap Router 02:** [`0x0214b0222ffB57C6a04310B4F42Cf7979D67f2C8`](https://explorer.testnet.citrea.xyz/address/0x0214b0222ffB57C6a04310B4F42Cf7979D67f2C8)

### V3 Periphery Contracts
- **Quoter V2:** [`0x14985Bc2967Dd38B1e71540d926F2c8f0dA0a1B5`](https://explorer.testnet.citrea.xyz/address/0x14985Bc2967Dd38B1e71540d926F2c8f0dA0a1B5)
- **Multicall2:** [`0xE8C31C8c482442bf4A608Eb1DAC1Df7FA239731D`](https://explorer.testnet.citrea.xyz/address/0xE8C31C8c482442bf4A608Eb1DAC1Df7FA239731D)
- **V3 Migrator:** [`0x2936DF6c0fa9A6C88744f035B3801044780F49c5`](https://explorer.testnet.citrea.xyz/address/0x2936DF6c0fa9A6C88744f035B3801044780F49c5)
- **V3 Staker:** [`0x477903E3449b1C6BEaB1fDA6b5a433eb7E64cD8b`](https://explorer.testnet.citrea.xyz/address/0x477903E3449b1C6BEaB1fDA6b5a433eb7E64cD8b)
- **Tick Lens:** [`0xD2C796E11baf2Ec95ee2a9796760FA51c0bb854D`](https://explorer.testnet.citrea.xyz/address/0xD2C796E11baf2Ec95ee2a9796760FA51c0bb854D)

### NFT & Descriptor Contracts
- **NFT Descriptor Library:** [`0x0689e8fF4937507C68dA9B78bdd858Ed56130635`](https://explorer.testnet.citrea.xyz/address/0x0689e8fF4937507C68dA9B78bdd858Ed56130635)
- **NFT Position Descriptor:** [`0x692395acA24FE3cD5D9A45D12299b809B4583E95`](https://explorer.testnet.citrea.xyz/address/0x692395acA24FE3cD5D9A45D12299b809B4583E95)
- **Descriptor Proxy:** [`0x7f12a6F709868A539eD9743863FcDfdb4a894ed4`](https://explorer.testnet.citrea.xyz/address/0x7f12a6F709868A539eD9743863FcDfdb4a894ed4)

### Utility Contracts
- **Proxy Admin:** [`0xBc6dD1660166C63bd41ec6943E4Ab81fA327B821`](https://explorer.testnet.citrea.xyz/address/0xBc6dD1660166C63bd41ec6943E4Ab81fA327B821)

## Configuration

- **WCBTC Address:** `0x8d0c9d1c17aE5e40ffF9bE350f57840E9E66Cd93`
- **Native Currency:** cBTC

## V2 LP Token Branding

- **Name:** JuiceSwap V2
- **Symbol:** JUICE-V2
- **Init Code Hash:** `0xdc3b9f52403077ec7261ad325e15f34e395cf7e2a5c3782098edb10a7599cc3e`

## V3 Fee Tiers Available

- 0.01% (1 bps) - Tick Spacing: 1
- 0.05% (5 bps) - Tick Spacing: 10
- 0.30% (30 bps) - Tick Spacing: 60
- 1.00% (100 bps) - Tick Spacing: 200

## How to Use JuiceSwap

### V2: Add Liquidity
1. Use the **V2 Router** at `0x48bA9db1EAcDB7C97B7B601c1E213F29E996d974`
2. Call `addLiquidity()` or `addLiquidityETH()` for cBTC pairs

### V2: Swap Tokens
1. Use the **V2 Router** at `0x48bA9db1EAcDB7C97B7B601c1E213F29E996d974`
2. Call `swapExactTokensForTokens()` or related swap functions

### V3: Create a Pool
1. Use the **V3 Core Factory** at `0x9136D17Ec096AAd031D442a796cd5984128cF0b2`
2. Call `createPool(tokenA, tokenB, fee)` with your desired tokens and fee tier

### V3: Add Liquidity
1. Use the **Position Manager** at `0x56D63E0F763b29F62bb7242420d028F86e9402E1`
2. Call `mint()` to create a new position

### V3: Swap Tokens
1. Use the **Swap Router** at `0x0214b0222ffB57C6a04310B4F42Cf7979D67f2C8`
2. Call `exactInputSingle()` or `exactOutputSingle()` for swaps

### V3: Get Quotes
1. Use the **Quoter V2** at `0x14985Bc2967Dd38B1e71540d926F2c8f0dA0a1B5`
2. Call `quoteExactInputSingle()` to get swap quotes

## Integration Example

```javascript
// V2: Swap tokens
const v2Router = new ethers.Contract(
  "0x48bA9db1EAcDB7C97B7B601c1E213F29E996d974",
  v2RouterABI,
  signer
);

await v2Router.swapExactTokensForTokens(
  amountIn,
  amountOutMin,
  [tokenA, tokenB],
  recipient,
  deadline
);

// V3: Creating a pool
const v3Factory = new ethers.Contract(
  "0x9136D17Ec096AAd031D442a796cd5984128cF0b2",
  v3FactoryABI,
  signer
);

// Create WCBTC/TOKEN pool with 0.3% fee
await v3Factory.createPool(
  "0x8d0c9d1c17aE5e40ffF9bE350f57840E9E66Cd93", // WCBTC
  "YOUR_TOKEN_ADDRESS",
  3000 // 0.3% fee
);
```

## Important Notes

1. **Testnet Only:** This deployment is on Citrea Testnet
2. **JuiceSwap Branding:** V2 LP tokens use JuiceSwap branding (JUICE-V2)
3. **BUSL License:** Based on Uniswap V2/V3 - check licensing requirements

## Deployment State

Complete deployment state saved in `deployments/citreaTestnet/dex.json`

---

**JuiceSwap V2 + V3** - Powered by Citrea Testnet
