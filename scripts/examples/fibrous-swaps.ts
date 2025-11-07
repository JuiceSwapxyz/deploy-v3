import { ethers } from 'ethers'
import { getCitreaWallet } from './src/util/wallet'

// Fibrous Router configuration
const FIBROUS_ROUTER = '0xf020580D26fEB76f927F4015c68389C01ff86348'

// Token addresses
const TOKENS = {
  CBTC: '0x8d0c9d1c17ae5e40fff9be350f57840e9e66cd93',
  SATSUMA_USDC: '0x36c16eac6b0ba6c50f494914ff015fca95b7835f',
  NUSD: '0x9b28b690550522608890c3c7e63c0b4a7ebab9aa',
  SUMA: '0xde4251dd68e1ad5865b14dd527e54018767af58a',
  WCBTC: '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0' // In case we need wrapped version
}

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
]

// Fibrous Router ABI (swap functions)
const ROUTER_ABI = [
  'function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address to, bytes calldata data) external returns (uint256)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  'event Swap(address indexed sender, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)'
]

async function performSwaps() {
  // Get wallet connected to Citrea
  const wallet = getCitreaWallet()
  const provider = wallet.provider

  console.log('🔄 Fibrous Swaps for Bapps Campaign')
  console.log('=====================================')
  console.log('📍 Wallet:', wallet.address)
  console.log('🔀 Router:', FIBROUS_ROUTER)
  console.log('')

  // Helper function to get token balance
  async function getBalance(tokenAddress: string, walletAddress: string): Promise<{balance: ethers.BigNumber, decimals: number, symbol: string}> {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
    const [balance, decimals, symbol] = await Promise.all([
      token.balanceOf(walletAddress),
      token.decimals(),
      token.symbol()
    ])
    return { balance, decimals, symbol }
  }

  // Helper function to approve token
  async function approveToken(tokenAddress: string, spenderAddress: string, amount: ethers.BigNumber) {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet)
    const allowance = await token.allowance(wallet.address, spenderAddress)

    if (allowance.lt(amount)) {
      console.log(`🔓 Approving ${tokenAddress}...`)
      const tx = await token.approve(spenderAddress, ethers.constants.MaxUint256)
      await tx.wait()
      console.log('✅ Approved!')
    } else {
      console.log('✅ Already approved')
    }
  }

  // Check initial balances
  console.log('📊 Initial Balances:')
  for (const [name, address] of Object.entries(TOKENS)) {
    try {
      const { balance, decimals, symbol } = await getBalance(address, wallet.address)
      console.log(`  ${name} (${symbol}): ${ethers.utils.formatUnits(balance, decimals)}`)
    } catch (e) {
      console.log(`  ${name}: Error fetching balance`)
    }
  }
  console.log('')

  const router = new ethers.Contract(FIBROUS_ROUTER, ROUTER_ABI, wallet)

  // Swap 1: CBTC to Satsuma USDC
  console.log('🔄 Swap 1: CBTC → Satsuma USDC')
  console.log('--------------------------------')
  try {
    const cbtcInfo = await getBalance(TOKENS.CBTC, wallet.address)

    if (cbtcInfo.balance.gt(0)) {
      const swapAmount = cbtcInfo.balance.div(10) // Swap 10% of balance
      console.log(`  Amount: ${ethers.utils.formatUnits(swapAmount, cbtcInfo.decimals)} ${cbtcInfo.symbol}`)

      await approveToken(TOKENS.CBTC, FIBROUS_ROUTER, swapAmount)

      console.log('  Executing swap...')
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

      try {
        // Try standard swap function
        const tx = await router.swapExactTokensForTokens(
          swapAmount,
          0, // Accept any amount of USDC
          [TOKENS.CBTC, TOKENS.SATSUMA_USDC],
          wallet.address,
          deadline,
          { gasLimit: 500000 }
        )

        console.log('  Tx:', tx.hash)
        const receipt = await tx.wait()
        console.log('  ✅ Swap 1 completed!')
        console.log(`  Gas used: ${receipt.gasUsed.toString()}`)
      } catch (swapError: any) {
        console.log('  ❌ Swap failed:', swapError.message)
      }
    } else {
      console.log('  ⚠️ No CBTC balance to swap')
    }
  } catch (error: any) {
    console.log('  ❌ Error:', error.message)
  }
  console.log('')

  // Swap 2: Satsuma USDC to NUSD
  console.log('🔄 Swap 2: Satsuma USDC → NUSD')
  console.log('--------------------------------')
  try {
    const usdcInfo = await getBalance(TOKENS.SATSUMA_USDC, wallet.address)

    if (usdcInfo.balance.gt(0)) {
      const swapAmount = usdcInfo.balance.div(10) // Swap 10% of balance
      console.log(`  Amount: ${ethers.utils.formatUnits(swapAmount, usdcInfo.decimals)} ${usdcInfo.symbol}`)

      await approveToken(TOKENS.SATSUMA_USDC, FIBROUS_ROUTER, swapAmount)

      console.log('  Executing swap...')
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20

      try {
        const tx = await router.swapExactTokensForTokens(
          swapAmount,
          0,
          [TOKENS.SATSUMA_USDC, TOKENS.NUSD],
          wallet.address,
          deadline,
          { gasLimit: 500000 }
        )

        console.log('  Tx:', tx.hash)
        const receipt = await tx.wait()
        console.log('  ✅ Swap 2 completed!')
        console.log(`  Gas used: ${receipt.gasUsed.toString()}`)
      } catch (swapError: any) {
        console.log('  ❌ Swap failed:', swapError.message)
      }
    } else {
      console.log('  ⚠️ No USDC balance to swap')
    }
  } catch (error: any) {
    console.log('  ❌ Error:', error.message)
  }
  console.log('')

  // Swap 3: NUSD to SUMA
  console.log('🔄 Swap 3: NUSD → SUMA')
  console.log('--------------------------------')
  try {
    const nusdInfo = await getBalance(TOKENS.NUSD, wallet.address)

    if (nusdInfo.balance.gt(0)) {
      const swapAmount = nusdInfo.balance.div(10) // Swap 10% of balance
      console.log(`  Amount: ${ethers.utils.formatUnits(swapAmount, nusdInfo.decimals)} ${nusdInfo.symbol}`)

      await approveToken(TOKENS.NUSD, FIBROUS_ROUTER, swapAmount)

      console.log('  Executing swap...')
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20

      try {
        const tx = await router.swapExactTokensForTokens(
          swapAmount,
          0,
          [TOKENS.NUSD, TOKENS.SUMA],
          wallet.address,
          deadline,
          { gasLimit: 500000 }
        )

        console.log('  Tx:', tx.hash)
        const receipt = await tx.wait()
        console.log('  ✅ Swap 3 completed!')
        console.log(`  Gas used: ${receipt.gasUsed.toString()}`)
      } catch (swapError: any) {
        console.log('  ❌ Swap failed:', swapError.message)
      }
    } else {
      console.log('  ⚠️ No NUSD balance to swap')
    }
  } catch (error: any) {
    console.log('  ❌ Error:', error.message)
  }
  console.log('')

  // Check final balances
  console.log('📊 Final Balances:')
  for (const [name, address] of Object.entries(TOKENS)) {
    try {
      const { balance, decimals, symbol } = await getBalance(address, wallet.address)
      console.log(`  ${name} (${symbol}): ${ethers.utils.formatUnits(balance, decimals)}`)
    } catch (e) {
      console.log(`  ${name}: Error fetching balance`)
    }
  }
  console.log('')
  console.log('✅ All swap attempts completed!')
}

performSwaps().catch(console.error)