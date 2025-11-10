import { ethers } from 'ethers'
import fs from 'fs'
import { execSync } from 'child_process'

// Citrea Testnet Configuration
const CITREA_CONFIG = {
  RPC_URL: 'https://rpc.testnet.citrea.xyz',
  CHAIN_ID: 5115,
  WETH9_ADDRESS: '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0',
  NATIVE_CURRENCY: 'cBTC',
  EXPLORER: 'https://explorer.testnet.citrea.xyz'
}

async function generateAndDeploy() {
  console.log('🔑 Generating new wallet for JuiceSwap V3 deployment...\n')
  
  // Generate new wallet
  const wallet = ethers.Wallet.createRandom()
  
  console.log('✅ New wallet generated!')
  console.log('================================')
  console.log('📍 Address:', wallet.address)
  console.log('🔐 Private Key:', wallet.privateKey)
  console.log('================================\n')
  
  // Save credentials securely
  const credentials = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase,
    generatedAt: new Date().toISOString(),
    network: 'citrea-testnet',
    chainId: CITREA_CONFIG.CHAIN_ID
  }
  
  // Save to file
  fs.writeFileSync('deployment-wallet.json', JSON.stringify(credentials, null, 2))
  console.log('💾 Wallet credentials saved to deployment-wallet.json')
  console.log('⚠️  IMPORTANT: Keep this file secure and never commit it to git!\n')
  
  // Create .env file
  const envContent = `# Citrea Testnet Deployment Configuration
# Generated: ${new Date().toISOString()}

# Deployer private key (auto-generated)
PRIVATE_KEY=${wallet.privateKey.slice(2)}

# Owner address (using same as deployer, change if needed)
OWNER_ADDRESS=${wallet.address}

# Optional: Gas price in GWEI
# GAS_PRICE=10
`
  
  fs.writeFileSync('.env', envContent)
  console.log('📝 Created .env file with credentials\n')
  
  // Add to .gitignore if not already there
  const gitignorePath = '.gitignore'
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8')
    if (!gitignore.includes('deployment-wallet.json')) {
      fs.appendFileSync(gitignorePath, '\n# Deployment credentials\ndeployment-wallet.json\n.env\n')
      console.log('🔒 Added security entries to .gitignore\n')
    }
  }
  
  // Connect to provider to check balance
  const provider = new ethers.providers.JsonRpcProvider(CITREA_CONFIG.RPC_URL, CITREA_CONFIG.CHAIN_ID)
  const connectedWallet = wallet.connect(provider)
  const balance = await connectedWallet.getBalance()
  
  console.log('🌐 Connected to Citrea Testnet')
  console.log('💰 Current Balance:', ethers.utils.formatEther(balance), 'cBTC\n')
  
  if (balance.eq(0)) {
    console.log('❌ Wallet has no funds!')
    console.log('📋 Next steps:')
    console.log('1. Fund this address with testnet cBTC:', wallet.address)
    console.log('2. Get testnet cBTC from the Citrea faucet')
    console.log('3. You need approximately 0.1-0.2 cBTC for deployment')
    console.log('4. Once funded, run: npx ts-node deploy-citrea.ts\n')
    
    // Create funding instructions file
    const fundingInstructions = `# Citrea Testnet Deployment - Funding Required

## Wallet Address
${wallet.address}

## Required Amount
0.1-0.2 cBTC (for gas fees)

## How to Get Testnet cBTC
1. Visit the Citrea testnet faucet
2. Enter the address above
3. Request testnet cBTC

## Check Balance
Visit: ${CITREA_CONFIG.EXPLORER}/address/${wallet.address}

## After Funding
Run the deployment:
\`\`\`bash
npx ts-node deploy-citrea.ts
\`\`\`

Generated: ${new Date().toISOString()}
`
    
    fs.writeFileSync('FUND_WALLET.md', fundingInstructions)
    console.log('📄 Funding instructions saved to FUND_WALLET.md')
    
  } else {
    console.log('✅ Wallet has funds! Ready to deploy.')
    console.log('\n🚀 Starting deployment automatically...\n')
    
    // Wait 2 seconds before starting
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    try {
      // Run deployment
      execSync('npx ts-node deploy-citrea.ts', { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Deployment failed:', error)
      process.exit(1)
    }
  }
}

// Run the script
generateAndDeploy().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})