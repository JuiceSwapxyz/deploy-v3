import { ethers } from 'ethers'
import { abi as IUniswapV3FactoryABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json'
import { abi as INonfungiblePositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json'

// ERC20 ABI for approve
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)"
]

async function createPoolAndAddLiquidity() {
  // Configuration
  const CITREA_RPC = 'https://rpc.testnet.citrea.xyz'
  const PRIVATE_KEY = '0x6270e932efe97360cefa8b16e4db0b839b2dae8a0aa9d9d7f30fd753884a97ba'

  // Contract addresses
  const FACTORY_ADDRESS = '0x6832283eEA5a9A3C4384A5D9a06Db0ce6FE9C79E'
  const POSITION_MANAGER_ADDRESS = '0xe46616BED47317653EE3B7794fC171F4444Ee1c5'
  const WCBTC_ADDRESS = '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0'
  const SECOND_TOKEN_ADDRESS = '0x9B28B690550522608890C3C7e63c0b4A7eBab9AA'

  // Pool configuration
  const FEE = 3000 // 0.3%
  const SQRT_PRICE_X96 = ethers.BigNumber.from('79228162514264337593543950336') // 1:1 initial price

  // Amounts
  const WCBTC_AMOUNT = ethers.utils.parseEther('0.0001') // 0.0001 WCBTC
  const SECOND_TOKEN_AMOUNT = ethers.utils.parseEther('1') // 1 Second Token

  // Connect to Citrea
  const provider = new ethers.providers.JsonRpcProvider(CITREA_RPC, 5115)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('🏊 Creating JuiceSwap V3 Pool: WCBTC/Second Token')
  console.log('=========================================')
  console.log('📍 Wallet:', wallet.address)
  console.log('🏭 Factory:', FACTORY_ADDRESS)
  console.log('📦 Position Manager:', POSITION_MANAGER_ADDRESS)
  console.log('')
  console.log('💎 Token Addresses:')
  console.log('  WCBTC:', WCBTC_ADDRESS)
  console.log('  Second Token:', SECOND_TOKEN_ADDRESS)
  console.log('')
  console.log('💰 Amounts:')
  console.log('  WCBTC:', ethers.utils.formatEther(WCBTC_AMOUNT))
  console.log('  Second Token:', ethers.utils.formatEther(SECOND_TOKEN_AMOUNT))
  console.log('')

  // Connect to contracts
  const factory = new ethers.Contract(FACTORY_ADDRESS, IUniswapV3FactoryABI, wallet)
  const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, wallet)
  const wcbtc = new ethers.Contract(WCBTC_ADDRESS, ERC20_ABI, wallet)
  const secondToken = new ethers.Contract(SECOND_TOKEN_ADDRESS, ERC20_ABI, wallet)

  try {
    // Check balances
    const wcbtcBalance = await wcbtc.balanceOf(wallet.address)
    const secondTokenBalance = await secondToken.balanceOf(wallet.address)

    console.log('Current Balances:')
    console.log('  WCBTC:', ethers.utils.formatEther(wcbtcBalance))
    console.log('  Second Token:', ethers.utils.formatEther(secondTokenBalance))
    console.log('')

    if (wcbtcBalance.lt(WCBTC_AMOUNT)) {
      throw new Error('Insufficient WCBTC balance')
    }
    if (secondTokenBalance.lt(SECOND_TOKEN_AMOUNT)) {
      throw new Error('Insufficient Second Token balance')
    }

    // Order tokens (token0 < token1)
    const [token0, token1, amount0, amount1] = WCBTC_ADDRESS.toLowerCase() < SECOND_TOKEN_ADDRESS.toLowerCase()
      ? [WCBTC_ADDRESS, SECOND_TOKEN_ADDRESS, WCBTC_AMOUNT, SECOND_TOKEN_AMOUNT]
      : [SECOND_TOKEN_ADDRESS, WCBTC_ADDRESS, SECOND_TOKEN_AMOUNT, WCBTC_AMOUNT]

    console.log('Token Order:')
    console.log('  Token0:', token0 === WCBTC_ADDRESS ? 'WCBTC' : 'Second Token')
    console.log('  Token1:', token1 === WCBTC_ADDRESS ? 'WCBTC' : 'Second Token')
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
      const poolContract = new ethers.Contract(
        poolAddress,
        ['function initialize(uint160 sqrtPriceX96) external'],
        wallet
      )

      console.log('💱 Initializing pool with sqrt price...')
      const initTx = await poolContract.initialize(SQRT_PRICE_X96, {
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
    const wcbtcApproveTx = await wcbtc.approve(POSITION_MANAGER_ADDRESS, WCBTC_AMOUNT, {
      gasLimit: 100000
    })
    await wcbtcApproveTx.wait()

    console.log('🔓 Approving Second Token...')
    const secondTokenApproveTx = await secondToken.approve(POSITION_MANAGER_ADDRESS, SECOND_TOKEN_AMOUNT, {
      gasLimit: 100000
    })
    await secondTokenApproveTx.wait()

    console.log('✅ Tokens approved!')
    console.log('')

    // Add liquidity
    console.log('💦 Adding liquidity to pool...')

    const mintParams = {
      token0: token0,
      token1: token1,
      fee: FEE,
      tickLower: -887220, // Full range
      tickUpper: 887220,  // Full range
      amount0Desired: amount0,
      amount1Desired: amount1,
      amount0Min: 0,
      amount1Min: 0,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes
    }

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

    console.log('🎉 Success! Pool created and liquidity added.')
    console.log('📊 Summary:')
    console.log('  Pool:', poolAddress)
    console.log('  Token0:', token0 === WCBTC_ADDRESS ? 'WCBTC' : 'Second Token')
    console.log('  Token1:', token1 === WCBTC_ADDRESS ? 'WCBTC' : 'Second Token')
    console.log('  Fee Tier:', FEE / 10000, '%')
    console.log('  Position NFT:', tokenId?.toString())
    console.log('')
    console.log('🔍 View on Explorer:')
    console.log(`  Pool: https://explorer.testnet.citrea.xyz/address/${poolAddress}`)
    console.log(`  Transaction: https://explorer.testnet.citrea.xyz/tx/${mintTx.hash}`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run
createPoolAndAddLiquidity().catch(console.error)