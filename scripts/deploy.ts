import { ethers, network } from 'hardhat'
import deploy from '../src/deploy'
import { MigrationState } from '../src/migrations'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { Provider, TransactionReceipt } from '@ethersproject/providers'

dotenv.config()

interface GasConfig {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

/** Returns network-specific gas configuration (values in gwei). */
function getGasConfig(networkName: string): GasConfig {
  const configs: Record<string, GasConfig> = {
    hardhat: {
      maxFeePerGas: '10',
      maxPriorityFeePerGas: '1',
    },
    localhost: {
      maxFeePerGas: '10',
      maxPriorityFeePerGas: '1',
    },
    citrea: {
      maxFeePerGas: '0.01',
      maxPriorityFeePerGas: '0.001',
    },
    citreaTestnet: {
      maxFeePerGas: '0.01',
      maxPriorityFeePerGas: '0.001',
    },
  }

  if (!configs[networkName]) {
    console.warn(`Unknown network "${networkName}", falling back to citreaTestnet gas config`);
  }
  return configs[networkName] || configs.citreaTestnet;
}

/**
 * Waits for a transaction with retry logic to handle RPC timeouts. Uses exponential backoff 
 * and falls back to manual receipt query if .wait() times out. This handles Citrea testnet 
 * RPC reliability issues.
 *
 * @param provider - The provider instance
 * @param hash - Transaction hash
 * @param confirmations - Number of confirmations to wait for
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @param baseDelayMs - Base delay in ms for exponential backoff (default: 2000)
 * @returns Transaction receipt if confirmed
 * @throws Error if transaction fails after all retries and fallback
 */
async function waitForTransactionWithRetry(
  provider: Provider,
  hash: string,
  confirmations: number,
  maxRetries: number = 5,
  baseDelayMs: number = 2000
): Promise<TransactionReceipt> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const receipt = await provider.waitForTransaction(hash, confirmations, 60000);
      return receipt;
    } catch (error: any) {
      lastError = error;

      const nonRetryableErrors = ['CALL_EXCEPTION', 'INSUFFICIENT_FUNDS', 'NONCE_EXPIRED', 'TRANSACTION_REPLACED'];
      if (error.code && nonRetryableErrors.includes(error.code)) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.warn(`Retry ${attempt + 1}/${maxRetries} for ${hash} after ${delayMs}ms (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }

  console.warn(`.waitForTransaction() failed after ${maxRetries} attempts, querying receipt manually...`);
  try {
    const receipt = await provider.getTransactionReceipt(hash);
    if (receipt && receipt.confirmations >= confirmations) {
      console.log(`Transaction confirmed despite waitForTransaction error: ${hash}`);
      return receipt;
    } else {
      console.error(`Transaction not found or insufficient confirmations: ${hash}`);
    }
  } catch (receiptError: any) {
    console.error(`Could not get receipt for ${hash}: ${receiptError.message}`);
  }

  throw lastError || new Error(`Failed to get receipt for ${hash} after ${maxRetries} retries`);
}

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

  const [signer] = await ethers.getSigners()
  const signerAddress = await signer.getAddress()

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
  const gasConfig = getGasConfig(networkName)

  // Validate required parameters
  if (!ownerAddress) {
    throw new Error('OWNER_ADDRESS environment variable is required for non-local networks')
  }

  console.log('📝 Configuration:')
  console.log(`  WETH9: ${weth9Address}`)
  console.log(`  Owner: ${ownerAddress}`)
  console.log(`  Native Currency: ${nativeCurrencyLabel}`)
  console.log(`  V2 Factory: ${v2CoreFactoryAddress}`)
  console.log(`  Max Fee Per Gas: ${gasConfig.maxFeePerGas} GWEI`)
  console.log(`  Max Priority Fee: ${gasConfig.maxPriorityFeePerGas} GWEI\n`)

  // Load existing deployment state using standardized structure
  // For localhost/hardhat: Skip state persistence (ephemeral networks, always fresh)
  // For production: Enable state persistence (resumable deployments)
  const deploymentDir = path.join(__dirname, '..', 'deployments', networkName)
  const stateFilePath = path.join(deploymentDir, 'dex.json')
  let initialState: MigrationState = {}
  let onStateChange: ((newState: MigrationState) => Promise<void>) | undefined

  // Create deployment directory if it doesn't exist
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true })
  }

  if (isLocal) {
    // Localhost: Always start fresh, don't load previous state
    console.log(`📋 Localhost deployment - starting fresh (ephemeral network)\n`)
  } else {
    // Production: Load existing state for resumable deployments
    if (fs.existsSync(stateFilePath)) {
      console.log(`📋 Loading existing deployment state from deployments/${networkName}/dex.json\n`)
      const savedData = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'))
      // Extract state from standardized schema
      initialState = savedData.contracts || {}
    } else {
      console.log(`📋 Starting fresh deployment (no existing deployments/${networkName}/dex.json)\n`)
    }
  }

  // Track final state for display at the end
  let finalState: MigrationState = {}

  // State change handler
  onStateChange = async (newState: MigrationState) => {
    finalState = newState

    const deploymentInfo = {
      schemaVersion: '1.0',
      network: {
        name: networkName,
        chainId: chainId
      },
      deployment: {
        deployedAt: new Date().toISOString(),
        deployedBy: signer.address,
        blockNumber: await ethers.provider.getBlockNumber()
      },
      contracts: newState,
      metadata: {
        deployer: 'JuiceSwapXyz/deploy-v3',
        deploymentMethod: 'incremental-migration',
        scriptVersion: '1.0.0'
      }
    }
    fs.writeFileSync(stateFilePath, JSON.stringify(deploymentInfo, null, 2))
  }

  // Convert native currency label to bytes32
  const nativeCurrencyLabelBytes = ethers.utils.formatBytes32String(nativeCurrencyLabel)

  // Execute deployment using existing migration system
  console.log('🔄 Executing deployment steps...\n')

  const deploymentGenerator = deploy({
    signer,
    maxFeePerGas: gasConfig.maxFeePerGas,
    maxPriorityFeePerGas: gasConfig.maxPriorityFeePerGas,
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

      // Wait for all transactions in this step sequentially with retry logic
      const txHashes = stepOutputs.filter(output => output.hash).map(output => output.hash!);
      if (txHashes.length > 0) {
        // Use 1 confirmation for localhost (auto-mining creates blocks only with new TXs)
        // Use 6 confirmations for production networks (industry standard for contract deployments)
        const confirmations = isLocal ? 1 : 6;
        console.log(`⏳ Waiting for ${txHashes.length} transaction(s) to confirm (${confirmations} confirmation${confirmations > 1 ? 's' : ''})...\n`);
        for (let i = 0; i < txHashes.length; i++) {
          try {
            await waitForTransactionWithRetry(ethers.provider, txHashes[i], confirmations);
            console.log(`   [${i + 1}/${txHashes.length}] Confirmed: ${txHashes[i]}`);
          } catch (error: any) {
            console.error(`   [${i + 1}/${txHashes.length}] Confirmation error: ${txHashes[i]} - ${error.message}`);
            throw error;
          }
        }
        console.log();
      }

      stepNumber++
    }

    console.log('🎉 Deployment Complete!\n')
    if (isLocal) {
      console.log(`📋 Localhost deployment (ephemeral - not saved to file)`)
    } else {
      console.log(`📄 Deployment state saved to: ${stateFilePath}`)
    }
    console.log('\n📦 Deployed Contracts:')

    // Read final state from file (production) or use in-memory state (localhost)
    const displayState = isLocal ? finalState : JSON.parse(fs.readFileSync(stateFilePath, 'utf8')).contracts

    console.log(`\n  UniswapV3Factory: ${displayState.v3CoreFactoryAddress || 'N/A'}`)
    console.log(`  JuiceSwap Position Manager: ${displayState.nonfungibleTokenPositionManagerAddress || 'N/A'}`)
    console.log(`  SwapRouter02: ${displayState.swapRouter02 || 'N/A'}`)
    console.log(`  QuoterV2: ${displayState.quoterV2Address || 'N/A'}`)
    console.log(`  NFT Descriptor Proxy: ${displayState.descriptorProxyAddress || 'N/A'}`)
    console.log(`  Multicall2: ${displayState.multicall2Address || 'N/A'}`)
    console.log(`  V3Migrator: ${displayState.v3MigratorAddress || 'N/A'}`)
    console.log(`  V3Staker: ${displayState.v3StakerAddress || 'N/A'}`)
    console.log(`  TickLens: ${displayState.tickLensAddress || 'N/A'}`)

    console.log('\n✨ JuiceSwap V3 is ready to use!')

  } catch (error: any) {
    console.error('\n❌ Deployment Failed!')
    console.error(`Error: ${error.message}\n`)

    if (error.transaction) {
      console.error('Transaction Details:')
      console.error(`  To: ${error.transaction.to}`)
      console.error(`  Data: ${error.transaction.data?.slice(0, 66)}...`)
    }

    if (!isLocal) {
      console.error(`\n💡 Deployment state saved to ${stateFilePath}`)
      console.error('   You can resume by running the command again.\n')
    } else {
      console.error(`\n💡 Localhost deployment failed - run again for fresh deployment.\n`)
    }

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
