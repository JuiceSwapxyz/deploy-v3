import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
import fs from 'fs'
import { abi as IUniswapV3FactoryABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json'
import { abi as INonfungiblePositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json'
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'

// Load environment variables
dotenv.config()

// ERC20 ABI for approve and balance checking
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)"
]

// WETH9 ABI for wrapping cBTC
const WETH9_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 wad)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
]

async function createCBTCtoUSDPool() {
  // Configuration
  const CITREA_RPC = 'https://rpc.testnet.citrea.xyz'
  const PRIVATE_KEY = process.env.PRIVATE_KEY

  if (!PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not found in .env')
    process.exit(1)
  }

  // Read deployment addresses
  const stateData = JSON.parse(fs.readFileSync('./state.json', 'utf8'))
  const cusdData = JSON.parse(fs.readFileSync('./cusd-deployment.json', 'utf8'))

  // Contract addresses from deployments
  const FACTORY_ADDRESS = stateData.v3CoreFactoryAddress
  const POSITION_MANAGER_ADDRESS = stateData.nonfungibleTokenPositionManagerAddress
  const WCBTC_ADDRESS = '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0' // WETH9 (Wrapped cBTC)
  const CUSD_ADDRESS = cusdData.tokenAddress

  // Pool configuration
  const FEE = 3000 // 0.3% fee tier

  // Amounts
  const CBTC_AMOUNT = ethers.utils.parseEther('0.1') // 0.1 cBTC
  const CUSD_AMOUNT = ethers.utils.parseEther('10000') // 10,000 cUSD

  // Calculate initial price (10000 cUSD = 0.1 cBTC, so 1 cBTC = 100,000 cUSD)
  // sqrtPriceX96 = sqrt(price) * 2^96
  // price = 100000 (cUSD per cBTC)
  // sqrt(100000) ≈ 316.227766
  // sqrtPriceX96 = 316.227766 * 2^96
  const sqrtPrice = Math.sqrt(100000)
  const SQRT_PRICE_X96 = ethers.BigNumber.from(
    ethers.utils.parseUnits(sqrtPrice.toFixed(18), 18)
      .mul(ethers.BigNumber.from(2).pow(96))
      .div(ethers.utils.parseUnits('1', 18))
  )

  // Connect to Citrea
  const provider = new ethers.providers.JsonRpcProvider(CITREA_RPC, 5115)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('🏊 Creating JuiceSwap V3 Pool: cBTC/cUSD')
  console.log('=========================================')
  console.log('📍 Wallet:', wallet.address)
  console.log('🏭 Factory:', FACTORY_ADDRESS)
  console.log('📦 Position Manager:', POSITION_MANAGER_ADDRESS)
  console.log('')
  console.log('💎 Token Addresses:')
  console.log('  Wrapped cBTC:', WCBTC_ADDRESS)
  console.log('  cUSD:', CUSD_ADDRESS)
  console.log('')
  console.log('💰 Amounts to Add:')
  console.log('  cBTC:', ethers.utils.formatEther(CBTC_AMOUNT))
  console.log('  cUSD:', ethers.utils.formatEther(CUSD_AMOUNT))
  console.log('')
  console.log('💱 Initial Price: 1 cBTC = 100,000 cUSD')
  console.log('')

  // Connect to contracts
  const factory = new ethers.Contract(FACTORY_ADDRESS, IUniswapV3FactoryABI, wallet)
  const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, wallet)
  const wcbtc = new ethers.Contract(WCBTC_ADDRESS, WETH9_ABI, wallet)
  const cusd = new ethers.Contract(CUSD_ADDRESS, ERC20_ABI, wallet)

  try {
    // Check native cBTC balance
    const nativeBalance = await wallet.getBalance()
    console.log('Current Native cBTC Balance:', ethers.utils.formatEther(nativeBalance))

    if (nativeBalance.lt(CBTC_AMOUNT)) {
      console.error('❌ Insufficient cBTC balance. You need at least 0.1 cBTC')
      process.exit(1)
    }

    // Check cUSD balance
    const cusdBalance = await cusd.balanceOf(wallet.address)
    console.log('Current cUSD Balance:', ethers.utils.formatEther(cusdBalance))

    if (cusdBalance.lt(CUSD_AMOUNT)) {
      console.error('❌ Insufficient cUSD balance. You need at least 10,000 cUSD')
      process.exit(1)
    }

    console.log('')

    // Wrap cBTC to WCBTC
    console.log('🔄 Wrapping cBTC to WCBTC...')
    const wrapTx = await wcbtc.deposit({ value: CBTC_AMOUNT, gasLimit: 100000 })
    console.log('📝 Wrap transaction:', wrapTx.hash)
    await wrapTx.wait()
    console.log('✅ cBTC wrapped successfully!')

    // Check WCBTC balance
    const wcbtcBalance = await wcbtc.balanceOf(wallet.address)
    console.log('WCBTC Balance after wrapping:', ethers.utils.formatEther(wcbtcBalance))
    console.log('')

    // Order tokens (token0 < token1)
    const [token0, token1, amount0Desired, amount1Desired] =
      WCBTC_ADDRESS.toLowerCase() < CUSD_ADDRESS.toLowerCase()
        ? [WCBTC_ADDRESS, CUSD_ADDRESS, CBTC_AMOUNT, CUSD_AMOUNT]
        : [CUSD_ADDRESS, WCBTC_ADDRESS, CUSD_AMOUNT, CBTC_AMOUNT]

    console.log('📋 Token Order:')
    console.log('  Token0:', token0 === WCBTC_ADDRESS ? 'WCBTC' : 'cUSD', `(${token0})`)
    console.log('  Token1:', token1 === WCBTC_ADDRESS ? 'WCBTC' : 'cUSD', `(${token1})`)
    console.log('')

    // Check if pool already exists
    let poolAddress = await factory.getPool(token0, token1, FEE)

    if (poolAddress === ethers.constants.AddressZero) {
      console.log('📝 Pool does not exist. Creating new pool...')

      // Create pool
      const createTx = await factory.createPool(token0, token1, FEE, {
        gasLimit: 5000000
      })

      console.log('⏳ Transaction hash:', createTx.hash)
      console.log('⏳ Waiting for confirmation...')

      const receipt = await createTx.wait()
      console.log('✅ Pool created!')

      // Get pool address from event
      const poolCreatedEvent = receipt.events?.find((e: any) => e.event === 'PoolCreated')
      poolAddress = poolCreatedEvent?.args?.pool

      console.log('🏊 Pool address:', poolAddress)

      // Initialize pool with initial price
      const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, wallet)

      // Adjust sqrtPrice based on token ordering
      const adjustedSqrtPrice = token0 === WCBTC_ADDRESS ? SQRT_PRICE_X96 :
        ethers.BigNumber.from(2).pow(192).div(SQRT_PRICE_X96)

      console.log('💱 Initializing pool with sqrt price:', adjustedSqrtPrice.toString())
      const initTx = await poolContract.initialize(adjustedSqrtPrice, {
        gasLimit: 300000
      })
      await initTx.wait()
      console.log('✅ Pool initialized!')
    } else {
      console.log('🏊 Pool already exists at:', poolAddress)
    }

    console.log('')
    console.log('💧 Adding liquidity...')

    // Approve tokens
    console.log('🔓 Approving WCBTC...')
    const wcbtcApproveTx = await wcbtc.approve(POSITION_MANAGER_ADDRESS, CBTC_AMOUNT, {
      gasLimit: 100000
    })
    await wcbtcApproveTx.wait()

    console.log('🔓 Approving cUSD...')
    const cusdApproveTx = await cusd.approve(POSITION_MANAGER_ADDRESS, CUSD_AMOUNT, {
      gasLimit: 100000
    })
    await cusdApproveTx.wait()

    console.log('✅ Tokens approved!')
    console.log('')

    // Add liquidity with full range
    console.log('💦 Adding liquidity to pool...')

    const mintParams = {
      token0: token0,
      token1: token1,
      fee: FEE,
      tickLower: -887220, // Full range for 0.3% pool
      tickUpper: 887220,  // Full range for 0.3% pool
      amount0Desired: amount0Desired,
      amount1Desired: amount1Desired,
      amount0Min: 0,
      amount1Min: 0,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes
    }

    console.log('Mint Parameters:', {
      ...mintParams,
      amount0Desired: ethers.utils.formatEther(mintParams.amount0Desired),
      amount1Desired: ethers.utils.formatEther(mintParams.amount1Desired)
    })

    const mintTx = await positionManager.mint(mintParams, {
      gasLimit: 1000000
    })

    console.log('📝 Mint transaction hash:', mintTx.hash)
    console.log('⏳ Waiting for confirmation...')

    const mintReceipt = await mintTx.wait()
    console.log('✅ Liquidity added successfully!')

    // Get NFT token ID from event
    const transferEvent = mintReceipt.events?.find((e: any) => e.event === 'Transfer')
    const tokenId = transferEvent?.args?.tokenId

    console.log('🎫 Position NFT Token ID:', tokenId?.toString())
    console.log('')

    // Save pool information
    const poolInfo = {
      network: 'Citrea Testnet',
      chainId: 5115,
      deploymentDate: new Date().toISOString(),
      poolAddress: poolAddress,
      token0: {
        address: token0,
        symbol: token0 === WCBTC_ADDRESS ? 'WCBTC' : 'cUSD',
        amount: ethers.utils.formatEther(amount0Desired)
      },
      token1: {
        address: token1,
        symbol: token1 === WCBTC_ADDRESS ? 'WCBTC' : 'cUSD',
        amount: ethers.utils.formatEther(amount1Desired)
      },
      feeTier: FEE,
      positionNFT: tokenId?.toString(),
      transactionHash: mintTx.hash,
      creator: wallet.address
    }

    fs.writeFileSync('cbtc-cusd-pool.json', JSON.stringify(poolInfo, null, 2))

    console.log('🎉 Success! Pool created and liquidity added.')
    console.log('📊 Summary:')
    console.log('  Pool:', poolAddress)
    console.log('  Token0:', token0 === WCBTC_ADDRESS ? 'WCBTC' : 'cUSD')
    console.log('  Token1:', token1 === WCBTC_ADDRESS ? 'WCBTC' : 'cUSD')
    console.log('  Fee Tier:', FEE / 10000, '%')
    console.log('  Position NFT:', tokenId?.toString())
    console.log('')
    console.log('🔍 View on Explorer:')
    console.log(`  Pool: https://explorer.testnet.citrea.xyz/address/${poolAddress}`)
    console.log(`  Transaction: https://explorer.testnet.citrea.xyz/tx/${mintTx.hash}`)
    console.log('')
    console.log('📝 Pool details saved to cbtc-cusd-pool.json')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run
createCBTCtoUSDPool().catch(console.error)