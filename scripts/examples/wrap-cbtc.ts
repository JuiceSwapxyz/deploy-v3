import { ethers } from 'ethers'
import { getCitreaWallet } from './src/util/wallet'

// WETH9 ABI for deposit function
const WETH9_ABI = [
  "function deposit() payable",
  "function withdraw(uint256) public",
  "function balanceOf(address) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
]

async function wrapCBTC() {
  // Get wallet connected to Citrea
  const wallet = getCitreaWallet()

  // Configuration
  const WETH9_ADDRESS = '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0'

  // Amount to wrap (0.001 cBTC)
  const amountToWrap = ethers.utils.parseEther('0.001')
  
  console.log('🔄 Wrapping cBTC to WETH (Wrapped cBTC)')
  console.log('=====================================')
  console.log('📍 Wallet:', wallet.address)
  console.log('💰 Amount to wrap:', ethers.utils.formatEther(amountToWrap), 'cBTC')
  console.log('📄 WETH9 Contract:', WETH9_ADDRESS)
  console.log('')
  
  // Get initial balances
  const initialBalance = await wallet.getBalance()
  console.log('Initial cBTC balance:', ethers.utils.formatEther(initialBalance), 'cBTC')
  
  // Connect to WETH9 contract
  const weth9 = new ethers.Contract(WETH9_ADDRESS, WETH9_ABI, wallet)
  
  // Get initial WETH balance
  const initialWETHBalance = await weth9.balanceOf(wallet.address)
  console.log('Initial WETH balance:', ethers.utils.formatEther(initialWETHBalance), 'WETH')
  console.log('')
  
  try {
    // Get token info
    const name = await weth9.name()
    const symbol = await weth9.symbol()
    console.log('Token Name:', name)
    console.log('Token Symbol:', symbol)
    console.log('')
    
    // Wrap cBTC by depositing to WETH9
    console.log('📤 Sending deposit transaction...')
    const tx = await weth9.deposit({ 
      value: amountToWrap,
      gasLimit: 100000 // Set explicit gas limit
    })
    
    console.log('📝 Transaction hash:', tx.hash)
    console.log('⏳ Waiting for confirmation...')
    
    // Wait for confirmation
    const receipt = await tx.wait()
    console.log('✅ Transaction confirmed!')
    console.log('Block:', receipt.blockNumber)
    console.log('Gas used:', receipt.gasUsed.toString())
    console.log('')
    
    // Get final balances
    const finalBalance = await wallet.getBalance()
    const finalWETHBalance = await weth9.balanceOf(wallet.address)
    
    console.log('📊 Final Balances:')
    console.log('================')
    console.log('cBTC balance:', ethers.utils.formatEther(finalBalance), 'cBTC')
    console.log('WETH balance:', ethers.utils.formatEther(finalWETHBalance), 'WETH')
    console.log('')
    
    // Calculate changes
    const cbtcSpent = initialBalance.sub(finalBalance)
    const wethReceived = finalWETHBalance.sub(initialWETHBalance)
    
    console.log('💱 Summary:')
    console.log('==========')
    console.log('cBTC spent (including gas):', ethers.utils.formatEther(cbtcSpent), 'cBTC')
    console.log('WETH received:', ethers.utils.formatEther(wethReceived), 'WETH')
    
    // Explorer link
    console.log('')
    console.log('🔍 View transaction:')
    console.log(`https://explorer.testnet.citrea.xyz/tx/${tx.hash}`)
    
  } catch (error) {
    console.error('❌ Error wrapping cBTC:', error)
  }
}

// Run the wrapping
wrapCBTC().catch(console.error)