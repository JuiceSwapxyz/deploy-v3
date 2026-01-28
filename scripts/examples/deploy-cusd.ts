import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
import fs from 'fs'
import { execSync } from 'child_process'

// Load environment variables
dotenv.config()

// Citrea Testnet Configuration
const CITREA_CONFIG = {
  RPC_URL: 'https://rpc.testnet.citreascan.com',
  CHAIN_ID: 5115,
  EXPLORER: 'https://testnet.citreascan.com'
}

async function deploycUSD() {
  console.log('💵 cUSD Token Deployment on Citrea Testnet')
  console.log('===========================================')
  console.log(`📍 Network: Citrea Testnet (Chain ID: ${CITREA_CONFIG.CHAIN_ID})`)
  console.log(`🌐 RPC URL: ${CITREA_CONFIG.RPC_URL}`)
  console.log(`🔍 Explorer: ${CITREA_CONFIG.EXPLORER}`)
  console.log('===========================================\n')

  // Validate environment variables
  const privateKey = process.env.PRIVATE_KEY

  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY environment variable is not set')
    console.error('Set it in .env file or export PRIVATE_KEY=your_private_key')
    process.exit(1)
  }

  try {
    // Connect to Citrea Testnet
    const provider = new ethers.providers.JsonRpcProvider(CITREA_CONFIG.RPC_URL)
    const wallet = new ethers.Wallet(privateKey, provider)

    console.log(`📱 Deployer Address: ${wallet.address}`)

    // Check balance
    const balance = await wallet.getBalance()
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} cBTC\n`)

    if (balance.eq(0)) {
      console.error('❌ Error: Insufficient balance to deploy contract')
      console.error('Please fund your wallet with cBTC from Citrea Testnet faucet')
      process.exit(1)
    }

    // Compile contract with solc
    console.log('📦 Compiling cUSD contract with solc...')

    // Create build directory if it doesn't exist
    if (!fs.existsSync('./build')) {
      fs.mkdirSync('./build')
    }

    execSync('npx solcjs --abi --bin contracts/cUSD.sol --include-path node_modules --base-path . -o build', { stdio: 'inherit' })

    // Read the compiled output (solcjs uses different naming)
    const abi = JSON.parse(fs.readFileSync('./build/contracts_cUSD_sol_cUSD.abi', 'utf8'))
    const bytecode = '0x' + fs.readFileSync('./build/contracts_cUSD_sol_cUSD.bin', 'utf8').trim()

    // Deploy contract
    console.log('\n🚀 Deploying cUSD Token...')
    const factory = new ethers.ContractFactory(abi, bytecode, wallet)
    const cUSDContract = await factory.deploy({
      gasLimit: 3000000
    })

    console.log(`📄 Transaction Hash: ${cUSDContract.deployTransaction.hash}`)
    console.log('⏳ Waiting for confirmation...')

    await cUSDContract.deployTransaction.wait(2)

    console.log(`\n✅ cUSD Token deployed successfully!`)
    console.log(`📍 Contract Address: ${cUSDContract.address}`)
    console.log(`🔍 Explorer: ${CITREA_CONFIG.EXPLORER}/address/${cUSDContract.address}`)

    // Verify token details
    const name = await cUSDContract.name()
    const symbol = await cUSDContract.symbol()
    const totalSupply = await cUSDContract.totalSupply()
    const decimals = await cUSDContract.decimals()

    console.log('\n📊 Token Details:')
    console.log(`  Name: ${name}`)
    console.log(`  Symbol: ${symbol}`)
    console.log(`  Decimals: ${decimals}`)
    console.log(`  Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)} ${symbol}`)
    console.log(`  Owner Balance: ${ethers.utils.formatUnits(totalSupply, decimals)} ${symbol}`)

    // Save deployment info
    const deploymentInfo = {
      network: 'Citrea Testnet',
      chainId: CITREA_CONFIG.CHAIN_ID,
      deploymentDate: new Date().toISOString(),
      tokenAddress: cUSDContract.address,
      transactionHash: cUSDContract.deployTransaction.hash,
      deployer: wallet.address,
      tokenDetails: {
        name,
        symbol,
        decimals,
        totalSupply: totalSupply.toString(),
        initialHolder: wallet.address
      }
    }

    fs.writeFileSync('cusd-deployment.json', JSON.stringify(deploymentInfo, null, 2))
    console.log('\n📝 Deployment info saved to cusd-deployment.json')

  } catch (error) {
    console.error('\n❌ Deployment failed!')
    console.error('Error:', error)
    process.exit(1)
  }
}

// Run deployment
deploycUSD().catch(console.error)