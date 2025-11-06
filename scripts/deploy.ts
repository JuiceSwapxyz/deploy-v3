import { ethers, network } from 'hardhat'
import deploy from '../src/deploy'
import { MigrationState } from '../src/migrations'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

/**
 * Hardhat deployment script for JuiceSwap V3
 *
 * This wraps the existing migration system and executes it via Hardhat runtime.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network citreaTestnet
 *
 * Configuration:
 *   - Network settings from hardhat.config.ts
 *   - Deployment parameters from .env:
 *     - WETH9_ADDRESS (required)
 *     - OWNER_ADDRESS (required)
 *     - NATIVE_CURRENCY_LABEL (default: "cBTC")
 *     - V2_FACTORY_ADDRESS (optional)
 *     - GAS_PRICE (optional, in GWEI)
 */
async function main() {
  console.log('\n🚀 Starting JuiceSwap V3 Deployment\n')

  // Get signer from Hardhat (uses accounts from hardhat.config.ts)
  const [signer] = await ethers.getSigners()
  const signerAddress = await signer.getAddress()

  // Get network info from Hardhat runtime and provider
  const networkName = network.name
  const { chainId } = await ethers.provider.getNetwork()
  const isLocal = networkName === 'localhost' || networkName === 'hardhat'

  console.log(`Deployer: ${signerAddress}`)
  console.log(`Network: ${networkName}`)
  console.log(`Chain ID: ${chainId}`)
  console.log(`Mode: ${isLocal ? 'LOCAL TESTING' : 'PRODUCTION'}\n`)

  // Handle WETH9 address
  let weth9Address: string

  if (isLocal) {
    // Local testing: Deploy WETH9Mock automatically
    console.log('🧪 Local network detected - deploying WETH9Mock...\n')
    const WETH9Factory = await ethers.getContractFactory('WETH9Mock')
    const weth9Mock = await WETH9Factory.deploy()
    await weth9Mock.deployed()
    weth9Address = weth9Mock.address
    console.log(`✅ WETH9Mock deployed at: ${weth9Address}\n`)
  } else {
    // Production: Use WETH9_ADDRESS from environment
    const envWeth9Address = process.env.WETH9_ADDRESS
    if (!envWeth9Address) {
      throw new Error('WETH9_ADDRESS environment variable is required for non-local networks')
    }
    weth9Address = envWeth9Address
  }

  // Load other configuration from environment
  const ownerAddress = process.env.OWNER_ADDRESS || (isLocal ? signerAddress : undefined)
  const nativeCurrencyLabel = process.env.NATIVE_CURRENCY_LABEL || 'cBTC'
  const v2CoreFactoryAddress = process.env.V2_FACTORY_ADDRESS || ethers.constants.AddressZero
  const gasPrice = process.env.GAS_PRICE ? parseInt(process.env.GAS_PRICE) : undefined

  // Validate required parameters
  if (!ownerAddress) {
    throw new Error('OWNER_ADDRESS environment variable is required for non-local networks')
  }

  console.log('📝 Configuration:')
  console.log(`  WETH9: ${weth9Address}`)
  console.log(`  Owner: ${ownerAddress}`)
  console.log(`  Native Currency: ${nativeCurrencyLabel}`)
  console.log(`  V2 Factory: ${v2CoreFactoryAddress}`)
  console.log(`  Gas Price: ${gasPrice || 'auto'} GWEI\n`)

  // Load existing deployment state (network-specific using network name)
  const stateFileName = `state.${networkName}.json`
  const stateFilePath = path.join(__dirname, '..', stateFileName)
  let initialState: MigrationState = {}

  if (fs.existsSync(stateFilePath)) {
    console.log(`📋 Loading existing deployment state from ${stateFileName}\n`)
    initialState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'))
  } else {
    console.log(`📋 Starting fresh deployment (no existing ${stateFileName})\n`)
  }

  // State change handler - saves to network-specific state file after each step
  const onStateChange = async (newState: MigrationState) => {
    fs.writeFileSync(stateFilePath, JSON.stringify(newState, null, 2))
  }

  // Convert native currency label to bytes32
  const nativeCurrencyLabelBytes = ethers.utils.formatBytes32String(nativeCurrencyLabel)

  // Execute deployment using existing migration system
  console.log('🔄 Executing deployment steps...\n')

  const deploymentGenerator = deploy({
    signer,
    gasPrice,
    initialState,
    onStateChange,
    weth9Address,
    nativeCurrencyLabelBytes,
    v2CoreFactoryAddress,
    ownerAddress,
  })

  let stepNumber = 1

  try {
    for await (const stepOutputs of deploymentGenerator) {
      for (const output of stepOutputs) {
        console.log(`✅ Step ${stepNumber}: ${output.message}`)
        if (output.address) {
          console.log(`   Address: ${output.address}`)
        }
        if (output.hash) {
          console.log(`   TX Hash: ${output.hash}`)
        }
        console.log()
      }
      stepNumber++
    }

    console.log('🎉 Deployment Complete!\n')
    console.log(`Deployment state saved to: ${stateFilePath}`)
    console.log('\n📦 Deployed Contracts:')

    // Read final state and display key addresses
    const finalState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'))

    console.log(`\n  UniswapV3Factory: ${finalState.v3CoreFactoryAddress || 'N/A'}`)
    console.log(`  JuiceSwap Position Manager: ${finalState.nonfungibleTokenPositionManagerAddress || 'N/A'}`)
    console.log(`  SwapRouter02: ${finalState.swapRouter02 || 'N/A'}`)
    console.log(`  QuoterV2: ${finalState.quoterV2Address || 'N/A'}`)
    console.log(`  NFT Descriptor Proxy: ${finalState.descriptorProxyAddress || 'N/A'}`)
    console.log(`  Multicall2: ${finalState.multicall2Address || 'N/A'}`)
    console.log(`  V3Migrator: ${finalState.v3MigratorAddress || 'N/A'}`)
    console.log(`  V3Staker: ${finalState.v3StakerAddress || 'N/A'}`)
    console.log(`  TickLens: ${finalState.tickLensAddress || 'N/A'}`)

    console.log('\n✨ JuiceSwap V3 is ready to use!')

  } catch (error: any) {
    console.error('\n❌ Deployment Failed!')
    console.error(`Error: ${error.message}\n`)

    if (error.transaction) {
      console.error('Transaction Details:')
      console.error(`  To: ${error.transaction.to}`)
      console.error(`  Data: ${error.transaction.data?.slice(0, 66)}...`)
    }

    console.error(`\n💡 Deployment state saved to ${stateFileName}`)
    console.error('   You can resume by running the command again.\n')

    throw error
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
