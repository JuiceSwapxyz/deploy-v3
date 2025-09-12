import { execSync } from 'child_process'
import * as dotenv from 'dotenv'
import fs from 'fs'

// Load environment variables
dotenv.config()

// Citrea Testnet Configuration
const CITREA_CONFIG = {
  RPC_URL: 'https://rpc.testnet.citrea.xyz',
  CHAIN_ID: 5115,
  WETH9_ADDRESS: '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0',
  NATIVE_CURRENCY: 'cBTC',
  EXPLORER: 'https://explorer.testnet.citrea.xyz'
}

async function deployCitreaJuiceSwapV3() {
  console.log('🧃 JuiceSwap V3 Deployment on Citrea Testnet')
  console.log('===========================================')
  console.log(`📍 Network: Citrea Testnet (Chain ID: ${CITREA_CONFIG.CHAIN_ID})`)
  console.log(`🌐 RPC URL: ${CITREA_CONFIG.RPC_URL}`)
  console.log(`💎 WETH9: ${CITREA_CONFIG.WETH9_ADDRESS}`)
  console.log(`🔍 Explorer: ${CITREA_CONFIG.EXPLORER}`)
  console.log('===========================================\n')

  // Validate environment variables
  const privateKey = process.env.PRIVATE_KEY
  const ownerAddress = process.env.OWNER_ADDRESS

  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY environment variable is not set')
    console.error('Set it in .env file or export PRIVATE_KEY=your_private_key')
    process.exit(1)
  }

  if (!ownerAddress) {
    console.error('❌ Error: OWNER_ADDRESS environment variable is not set')
    console.error('Set it in .env file or export OWNER_ADDRESS=your_address')
    process.exit(1)
  }

  // Check for existing state
  if (fs.existsSync('./state.json')) {
    console.log('⚠️  Found existing state.json')
    console.log('This means a previous deployment was started.')
    console.log('Remove state.json to start fresh, or keep it to continue from last step.\n')
  }

  // Build the deployment command
  const deployCommand = `npx ts-node index.ts \
    --private-key ${privateKey} \
    --json-rpc ${CITREA_CONFIG.RPC_URL} \
    --weth9-address ${CITREA_CONFIG.WETH9_ADDRESS} \
    --native-currency-label ${CITREA_CONFIG.NATIVE_CURRENCY} \
    --owner-address ${ownerAddress} \
    --confirmations 2 \
    --state ./state.json`

  console.log('📦 Starting deployment...\n')

  try {
    // Execute deployment
    execSync(deployCommand, { stdio: 'inherit' })
    
    console.log('\n✅ Deployment completed successfully!')
    
    // Read and display the final state
    if (fs.existsSync('./state.json')) {
      const state = JSON.parse(fs.readFileSync('./state.json', 'utf8'))
      
      console.log('\n📍 Deployed Contract Addresses:')
      console.log('================================')
      
      // Core contracts
      if (state.v3CoreFactoryAddress) {
        console.log(`V3 Core Factory: ${state.v3CoreFactoryAddress}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.v3CoreFactoryAddress}`)
      }
      
      if (state.multicall2Address) {
        console.log(`\nMulticall2: ${state.multicall2Address}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.multicall2Address}`)
      }
      
      if (state.proxyAdminAddress) {
        console.log(`\nProxy Admin: ${state.proxyAdminAddress}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.proxyAdminAddress}`)
      }
      
      if (state.tickLensAddress) {
        console.log(`\nTick Lens: ${state.tickLensAddress}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.tickLensAddress}`)
      }
      
      // NFT contracts
      if (state.nftDescriptorLibraryAddressV1_3_0) {
        console.log(`\nNFT Descriptor Library: ${state.nftDescriptorLibraryAddressV1_3_0}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.nftDescriptorLibraryAddressV1_3_0}`)
      }
      
      if (state.nftPositionDescriptorAddressV1_3_0) {
        console.log(`\nNFT Position Descriptor: ${state.nftPositionDescriptorAddressV1_3_0}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.nftPositionDescriptorAddressV1_3_0}`)
      }
      
      if (state.transparentUpgradeableProxyAddress) {
        console.log(`\nTransparent Upgradeable Proxy: ${state.transparentUpgradeableProxyAddress}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.transparentUpgradeableProxyAddress}`)
      }
      
      if (state.nonfungiblePositionManagerAddress) {
        console.log(`\nNon-Fungible Position Manager: ${state.nonfungiblePositionManagerAddress}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.nonfungiblePositionManagerAddress}`)
      }
      
      // Migration and staking
      if (state.v3MigratorAddress) {
        console.log(`\nV3 Migrator: ${state.v3MigratorAddress}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.v3MigratorAddress}`)
      }
      
      if (state.v3StakerAddress) {
        console.log(`\nV3 Staker: ${state.v3StakerAddress}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.v3StakerAddress}`)
      }
      
      // Router contracts
      if (state.quoterV2Address) {
        console.log(`\nQuoter V2: ${state.quoterV2Address}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.quoterV2Address}`)
      }
      
      if (state.swapRouter02Address) {
        console.log(`\nSwap Router 02: ${state.swapRouter02Address}`)
        console.log(`  Explorer: ${CITREA_CONFIG.EXPLORER}/address/${state.swapRouter02Address}`)
      }
      
      console.log('\n================================')
      console.log('🎉 All JuiceSwap V3 contracts deployed successfully!')
      console.log('\n📄 Full deployment details saved in state.json')
      
      // Save a summary file
      const summary = {
        network: 'Citrea Testnet',
        chainId: CITREA_CONFIG.CHAIN_ID,
        deploymentDate: new Date().toISOString(),
        weth9Address: CITREA_CONFIG.WETH9_ADDRESS,
        contracts: {
          v3CoreFactory: state.v3CoreFactoryAddress,
          nonfungiblePositionManager: state.nonfungiblePositionManagerAddress,
          swapRouter02: state.swapRouter02Address,
          quoterV2: state.quoterV2Address,
          multicall2: state.multicall2Address,
          v3Staker: state.v3StakerAddress,
          v3Migrator: state.v3MigratorAddress
        }
      }
      
      fs.writeFileSync('citrea-deployment-summary.json', JSON.stringify(summary, null, 2))
      console.log('📝 Deployment summary saved to citrea-deployment-summary.json')
    }
    
  } catch (error) {
    console.error('\n❌ Deployment failed!')
    console.error('Error:', error)
    console.log('\nCheck state.json for partial deployment status')
    process.exit(1)
  }
}

// Run deployment
deployCitreaJuiceSwapV3().catch(console.error)