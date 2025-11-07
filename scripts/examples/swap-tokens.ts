import { ethers } from 'ethers'
import { abi as ISwapRouterABI } from '@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json'
import { getCitreaWallet } from './src/util/wallet'

// ERC20 ABI for approve and balance
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]

async function swapTFCtoWCBTC() {
  // Get wallet connected to Citrea
  const wallet = getCitreaWallet()

  // Contract addresses
  const SWAP_ROUTER_ADDRESS = '0x610c98EAD0df13EA906854b6041122e8A8D14413'
  const WCBTC_ADDRESS = '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0'
  const TFC_ADDRESS = '0x14ADf6B87096Ef750a956756BA191fc6BE94e473'
  const POOL_ADDRESS = '0x21180B20134C8913bfA6dc866e43A114c026169e'

  // Swap parameters
  const TFC_AMOUNT = ethers.utils.parseEther('0.01') // 0.01 TFC
  const FEE = 3000 // 0.3%
  
  console.log('💱 JuiceSwap V3: Swapping TFC for WCBTC')
  console.log('========================================')
  console.log('📍 Wallet:', wallet.address)
  console.log('🔄 Swap Router:', SWAP_ROUTER_ADDRESS)
  console.log('🏊 Pool:', POOL_ADDRESS)
  console.log('')
  console.log('📊 Swap Details:')
  console.log('  From: 0.01 TFC')
  console.log('  To: WCBTC (amount to be determined)')
  console.log('  Fee: 0.3%')
  console.log('')
  
  // Connect to contracts
  const swapRouter = new ethers.Contract(SWAP_ROUTER_ADDRESS, ISwapRouterABI, wallet)
  const tfc = new ethers.Contract(TFC_ADDRESS, ERC20_ABI, wallet)
  const wcbtc = new ethers.Contract(WCBTC_ADDRESS, ERC20_ABI, wallet)
  
  try {
    // Get initial balances
    const tfcBalanceBefore = await tfc.balanceOf(wallet.address)
    const wcbtcBalanceBefore = await wcbtc.balanceOf(wallet.address)
    
    console.log('💰 Balances Before Swap:')
    console.log('  TFC:', ethers.utils.formatEther(tfcBalanceBefore))
    console.log('  WCBTC:', ethers.utils.formatEther(wcbtcBalanceBefore))
    console.log('')
    
    // Check if we have enough TFC
    if (tfcBalanceBefore.lt(TFC_AMOUNT)) {
      throw new Error('Insufficient TFC balance')
    }
    
    // Approve TFC for swap router
    console.log('🔓 Approving TFC for swap...')
    const approveTx = await tfc.approve(SWAP_ROUTER_ADDRESS, TFC_AMOUNT, {
      gasLimit: 100000
    })
    await approveTx.wait()
    console.log('✅ TFC approved!')
    console.log('')
    
    // Prepare swap parameters
    const swapParams = {
      tokenIn: TFC_ADDRESS,
      tokenOut: WCBTC_ADDRESS,
      fee: FEE,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
      amountIn: TFC_AMOUNT,
      amountOutMinimum: 0, // Accept any amount for now (in production, calculate slippage)
      sqrtPriceLimitX96: 0 // No price limit
    }
    
    console.log('🔄 Executing swap...')
    console.log('  Amount In:', ethers.utils.formatEther(TFC_AMOUNT), 'TFC')
    console.log('  Min Amount Out: No minimum (accept any amount)')
    console.log('')
    
    // Execute swap
    const swapTx = await swapRouter.exactInputSingle(swapParams, {
      gasLimit: 300000
    })
    
    console.log('📝 Swap transaction hash:', swapTx.hash)
    console.log('⏳ Waiting for confirmation...')
    
    const receipt = await swapTx.wait()
    console.log('✅ Swap executed successfully!')
    console.log('')
    
    // Get final balances
    const tfcBalanceAfter = await tfc.balanceOf(wallet.address)
    const wcbtcBalanceAfter = await wcbtc.balanceOf(wallet.address)
    
    console.log('💰 Balances After Swap:')
    console.log('  TFC:', ethers.utils.formatEther(tfcBalanceAfter))
    console.log('  WCBTC:', ethers.utils.formatEther(wcbtcBalanceAfter))
    console.log('')
    
    // Calculate amounts
    const tfcSpent = tfcBalanceBefore.sub(tfcBalanceAfter)
    const wcbtcReceived = wcbtcBalanceAfter.sub(wcbtcBalanceBefore)
    
    console.log('📊 Swap Summary:')
    console.log('================')
    console.log('  TFC Spent:', ethers.utils.formatEther(tfcSpent))
    console.log('  WCBTC Received:', ethers.utils.formatEther(wcbtcReceived))
    
    // Calculate effective price
    if (wcbtcReceived.gt(0)) {
      const price = parseFloat(ethers.utils.formatEther(tfcSpent)) / parseFloat(ethers.utils.formatEther(wcbtcReceived))
      console.log('  Effective Price:', price.toFixed(6), 'TFC per WCBTC')
    }
    
    console.log('')
    console.log('🔍 View on Explorer:')
    console.log(`  Transaction: https://explorer.testnet.citrea.xyz/tx/${swapTx.hash}`)
    console.log('')
    console.log('🎉 Swap completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during swap:', error)
  }
}

// Run the swap
swapTFCtoWCBTC().catch(console.error)