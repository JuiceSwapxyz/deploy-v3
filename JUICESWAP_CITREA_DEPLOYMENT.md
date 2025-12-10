# 🧃 JuiceSwap V3 - Citrea Testnet Deployment

## ✅ Deployment erfolgreich abgeschlossen!

**Deployment Date:** 2025-09-12  
**Network:** Citrea Testnet (Chain ID: 5115)  
**Deployer:** 0xc89E49490020fc4e8eE681553A2354234Fc3F1D4

## 📍 Deployed Contract Addresses

### Core Contracts
- **V3 Core Factory:** [`0x6832283eEA5a9A3C4384A5D9a06Db0ce6FE9C79E`](https://explorer.testnet.citrea.xyz/address/0x6832283eEA5a9A3C4384A5D9a06Db0ce6FE9C79E)
- **Position Manager:** [`0xe46616BED47317653EE3B7794fC171F4444Ee1c5`](https://explorer.testnet.citrea.xyz/address/0xe46616BED47317653EE3B7794fC171F4444Ee1c5)
- **Swap Router 02:** [`0x610c98EAD0df13EA906854b6041122e8A8D14413`](https://explorer.testnet.citrea.xyz/address/0x610c98EAD0df13EA906854b6041122e8A8D14413)

### Periphery Contracts
- **Quoter V2:** [`0x8068F946D23B18Ab36Bc09A7DFF177b37525aB20`](https://explorer.testnet.citrea.xyz/address/0x8068F946D23B18Ab36Bc09A7DFF177b37525aB20)
- **Multicall2:** [`0x523A5dbC640Ed57b0Df84f1Df0a77f8AC32D194F`](https://explorer.testnet.citrea.xyz/address/0x523A5dbC640Ed57b0Df84f1Df0a77f8AC32D194F)
- **V3 Migrator:** [`0xFEfc44dCE815ddCE511Ac6664C6802A29e4B7A89`](https://explorer.testnet.citrea.xyz/address/0xFEfc44dCE815ddCE511Ac6664C6802A29e4B7A89)
- **V3 Staker:** [`0xf2d7f770E4875e4b73C118f18d79060e70e689D4`](https://explorer.testnet.citrea.xyz/address/0xf2d7f770E4875e4b73C118f18d79060e70e689D4)

### NFT & Descriptor Contracts
- **NFT Descriptor Library:** [`0xa6f4e59c0eC5F264b64d8174e802cdDb9fD9897f`](https://explorer.testnet.citrea.xyz/address/0xa6f4e59c0eC5F264b64d8174e802cdDb9fD9897f)
- **NFT Position Descriptor:** [`0xa1876e80f2c85F1A2808e6BA365B639a0F438f70`](https://explorer.testnet.citrea.xyz/address/0xa1876e80f2c85F1A2808e6BA365B639a0F438f70)
- **Descriptor Proxy:** [`0x116FEE5CE01E82A762d013322fFad357BF3e6BCD`](https://explorer.testnet.citrea.xyz/address/0x116FEE5CE01E82A762d013322fFad357BF3e6BCD)

### Utility Contracts
- **Tick Lens:** [`0x00eE5DFBc946cE98D4293ba4463A243460113C72`](https://explorer.testnet.citrea.xyz/address/0x00eE5DFBc946cE98D4293ba4463A243460113C72)
- **Proxy Admin:** [`0x3F7a8cC3722fCad90040466EC2CfB618054f5e62`](https://explorer.testnet.citrea.xyz/address/0x3F7a8cC3722fCad90040466EC2CfB618054f5e62)

## 🔧 Configuration

- **WCBTC Address:** `0x8d0c9d1c17aE5e40ffF9bE350f57840E9E66Cd93`
- **Native Currency:** cBTC
- **Owner:** `0xc89E49490020fc4e8eE681553A2354234Fc3F1D4`

## 📊 Fee Tiers Available

- 0.01% (1 bps) - Tick Spacing: 1
- 0.05% (5 bps) - Tick Spacing: 10  
- 0.30% (30 bps) - Tick Spacing: 60
- 1.00% (100 bps) - Tick Spacing: 200

## 🚀 How to Use JuiceSwap V3

### Create a Pool
1. Use the **V3 Core Factory** at `0x6832283eEA5a9A3C4384A5D9a06Db0ce6FE9C79E`
2. Call `createPool(tokenA, tokenB, fee)` with your desired tokens and fee tier

### Add Liquidity
1. Use the **Position Manager** at `0xe46616BED47317653EE3B7794fC171F4444Ee1c5`
2. Call `mint()` to create a new position

### Swap Tokens
1. Use the **Swap Router** at `0x610c98EAD0df13EA906854b6041122e8A8D14413`
2. Call `exactInputSingle()` or `exactOutputSingle()` for swaps

### Get Quotes
1. Use the **Quoter V2** at `0x8068F946D23B18Ab36Bc09A7DFF177b37525aB20`
2. Call `quoteExactInputSingle()` to get swap quotes

## 🔗 Integration Example

```javascript
// Example: Creating a pool
const factory = new ethers.Contract(
  "0x6832283eEA5a9A3C4384A5D9a06Db0ce6FE9C79E",
  factoryABI,
  signer
);

// Create WCBTC/TOKEN pool with 0.3% fee
await factory.createPool(
  "0x8d0c9d1c17aE5e40ffF9bE350f57840E9E66Cd93", // WCBTC
  "YOUR_TOKEN_ADDRESS",
  3000 // 0.3% fee
);
```

## 📝 Important Notes

1. **Testnet Only:** This deployment is on Citrea Testnet
2. **JuiceSwap Branding:** Modified from Uniswap V3 with JuiceSwap branding
3. **BUSL License:** Based on Uniswap V3 - check licensing requirements
4. **Owner Control:** Contract ownership is with `0xc89E49490020fc4e8eE681553A2354234Fc3F1D4`

## 📈 Next Steps

1. **Create Initial Pools:** Deploy pools for key token pairs
2. **Add Liquidity:** Provide initial liquidity to pools
3. **Frontend Integration:** Build UI for JuiceSwap
4. **Testing:** Thoroughly test all functionalities

## 🔍 Deployment Transactions

All deployment transactions can be viewed on [Citrea Testnet Explorer](https://explorer.testnet.citrea.xyz)

## 💾 State File

Complete deployment state saved in `state.json`

---

**JuiceSwap V3** - Powered by Citrea Testnet 🧃