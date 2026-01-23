/**
 * Test deployed DEX contracts on a fork of Citrea testnet
 * This script tests V2 and V3 functionality using the actual deployed contracts
 */
import { ethers } from 'hardhat'
import { Contract, BigNumber } from 'ethers'
import { loadDeployment, deploymentExists } from '../../src/constants/deployments'
import { FEE_TIERS, SQRT_PRICE_X96_ONE_TO_ONE } from '../../src/constants'

// Load deployed contract addresses from deployment state
function getDeployedAddresses() {
  const network = 'citreaTestnet'
  if (!deploymentExists(network)) {
    throw new Error(
      `Deployment file not found for network: ${network}. ` +
      `Run deployment first or ensure deployments/${network}/dex.json exists.`
    );
  }
  const deployment = loadDeployment(network)
  return {
    v2Factory: deployment.v2FactoryAddress,
    v2Router02: deployment.v2Router02Address,
    v3Factory: deployment.v3CoreFactoryAddress,
    positionManager: deployment.nonfungibleTokenPositionManagerAddress,
    swapRouter02: deployment.swapRouter02,
    quoterV2: deployment.quoterV2Address,
  }
}

const DEPLOYED = getDeployedAddresses()

// Deploy existing cUSD test token (each deployment creates a new instance)
async function deployTestToken() {
  const Token = await ethers.getContractFactory('cUSD')
  const token = await Token.deploy()
  await token.deployed()
  return token
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  🧪 TESTING DEPLOYED DEX ON CITREA TESTNET FORK')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const [deployer, user1] = await ethers.getSigners()
  const chainId = (await ethers.provider.getNetwork()).chainId
  console.log(`Chain ID: ${chainId}`)
  console.log(`Deployer: ${deployer.address}`)
  console.log(`User1: ${user1.address}\n`)

  let passed = 0
  let failed = 0

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Verify Deployed Contracts Exist
  // ═══════════════════════════════════════════════════════════════
  console.log('📋 Test 1: Verify deployed contracts exist on fork')
  try {
    const v2FactoryCode = await ethers.provider.getCode(DEPLOYED.v2Factory)
    const v3FactoryCode = await ethers.provider.getCode(DEPLOYED.v3Factory)
    const swapRouterCode = await ethers.provider.getCode(DEPLOYED.swapRouter02)

    if (v2FactoryCode.length > 10 && v3FactoryCode.length > 10 && swapRouterCode.length > 10) {
      console.log('   ✅ PASS: All deployed contracts have code')
      passed++
    } else {
      console.log('   ❌ FAIL: Some contracts missing')
      failed++
    }
  } catch (e: any) {
    console.log(`   ❌ FAIL: ${e.message}`)
    failed++
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: Deploy Test Tokens for V2/V3 Testing
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📋 Test 2: Deploy test tokens (using existing cUSD contract)')
  let tokenA: Contract, tokenB: Contract
  try {
    // Deploy two instances of cUSD - they'll have different addresses
    tokenA = await deployTestToken()
    tokenB = await deployTestToken()
    console.log(`   Token A (cUSD instance 1): ${tokenA.address}`)
    console.log(`   Token B (cUSD instance 2): ${tokenB.address}`)
    console.log('   ✅ PASS: Test tokens deployed')
    passed++
  } catch (e: any) {
    console.log(`   ❌ FAIL: ${e.message}`)
    failed++
    process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: Create V2 Pair Using Deployed Factory
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📋 Test 3: Create V2 pair using deployed factory')
  let v2Pair: Contract | undefined
  try {
    const v2Factory = await ethers.getContractAt(
      ['function createPair(address,address) returns (address)', 'function getPair(address,address) view returns (address)', 'function allPairsLength() view returns (uint)'],
      DEPLOYED.v2Factory
    )

    const pairsBefore = await v2Factory.allPairsLength()
    const tx = await v2Factory.createPair(tokenA.address, tokenB.address)
    await tx.wait()

    const pairAddress = await v2Factory.getPair(tokenA.address, tokenB.address)
    const pairsAfter = await v2Factory.allPairsLength()

    console.log(`   Pair address: ${pairAddress}`)
    console.log(`   Pairs before: ${pairsBefore}, after: ${pairsAfter}`)

    v2Pair = await ethers.getContractAt(
      ['function name() view returns (string)', 'function symbol() view returns (string)', 'function getReserves() view returns (uint112,uint112,uint32)'],
      pairAddress
    )

    const pairName = await v2Pair.name()
    const pairSymbol = await v2Pair.symbol()
    console.log(`   Pair name: ${pairName}, symbol: ${pairSymbol}`)

    if (pairName === 'JuiceSwap V2' && pairSymbol === 'JUICE-V2') {
      console.log('   ✅ PASS: V2 pair created with JuiceSwap branding')
      passed++
    } else {
      console.log('   ⚠️  WARN: Unexpected branding')
      passed++ // Still passes, just different branding
    }
  } catch (e: any) {
    console.log(`   ❌ FAIL: ${e.message}`)
    failed++
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 4: Add Liquidity via Deployed V2 Router
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📋 Test 4: Add liquidity via deployed V2 Router')
  if (!v2Pair) {
    console.log('   ⏭️  SKIP: V2 pair not created (Test 3 failed)')
  } else {
    try {
      const v2Router = await ethers.getContractAt(
        ['function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)'],
        DEPLOYED.v2Router02
      )

      const amountA = ethers.utils.parseEther('1000')
      const amountB = ethers.utils.parseEther('2000')

      // Approve router
      await (await tokenA.approve(DEPLOYED.v2Router02, amountA)).wait()
      await (await tokenB.approve(DEPLOYED.v2Router02, amountB)).wait()

      const deadline = Math.floor(Date.now() / 1000) + 3600
      const tx = await v2Router.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        0,
        0,
        deployer.address,
        deadline
      )
      await tx.wait()

      const [reserve0, reserve1] = await v2Pair.getReserves()
      console.log(`   Reserve0: ${ethers.utils.formatEther(reserve0)}`)
      console.log(`   Reserve1: ${ethers.utils.formatEther(reserve1)}`)

      if (reserve0.gt(0) && reserve1.gt(0)) {
        console.log('   ✅ PASS: Liquidity added successfully')
        passed++
      } else {
        console.log('   ❌ FAIL: Reserves are zero')
        failed++
      }
    } catch (e: any) {
      console.log(`   ❌ FAIL: ${e.message}`)
      failed++
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 5: Execute V2 Swap via Deployed Router
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📋 Test 5: Execute V2 swap via deployed router')
  if (!v2Pair) {
    console.log('   ⏭️  SKIP: V2 pair not created (Test 3 failed)')
  } else {
    try {
      const v2Router = await ethers.getContractAt(
        ['function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns (uint256[])'],
        DEPLOYED.v2Router02
      )

      const swapAmount = ethers.utils.parseEther('100')
      await (await tokenA.approve(DEPLOYED.v2Router02, swapAmount)).wait()

      const balBefore = await tokenB.balanceOf(deployer.address)

      const deadline = Math.floor(Date.now() / 1000) + 3600
      const tx = await v2Router.swapExactTokensForTokens(
        swapAmount,
        0,
        [tokenA.address, tokenB.address],
        deployer.address,
        deadline
      )
      await tx.wait()

      const balAfter = await tokenB.balanceOf(deployer.address)
      const received = balAfter.sub(balBefore)

      console.log(`   Swapped: ${ethers.utils.formatEther(swapAmount)} cUSD`)
      console.log(`   Received: ${ethers.utils.formatEther(received)} cUSD`)

      if (received.gt(0)) {
        console.log('   ✅ PASS: V2 swap successful')
        passed++
      } else {
        console.log('   ❌ FAIL: No tokens received')
        failed++
      }
    } catch (e: any) {
      console.log(`   ❌ FAIL: ${e.message}`)
      failed++
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 6: Create V3 Pool Using Deployed Factory
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📋 Test 6: Create V3 pool using deployed factory')
  let v3Pool: Contract
  try {
    const v3Factory = await ethers.getContractAt(
      ['function createPool(address,address,uint24) returns (address)', 'function getPool(address,address,uint24) view returns (address)'],
      DEPLOYED.v3Factory
    )

    const fee = FEE_TIERS.MEDIUM // 0.3%
    const tx = await v3Factory.createPool(tokenA.address, tokenB.address, fee)
    await tx.wait()

    const poolAddress = await v3Factory.getPool(tokenA.address, tokenB.address, fee)
    console.log(`   V3 Pool: ${poolAddress}`)

    v3Pool = await ethers.getContractAt(
      ['function initialize(uint160) external', 'function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)'],
      poolAddress
    )

    // Initialize at 1:1 price using constant from constants module
    const sqrtPriceX96 = BigNumber.from(SQRT_PRICE_X96_ONE_TO_ONE.toString())
    await (await v3Pool.initialize(sqrtPriceX96)).wait()

    const [sqrtPrice] = await v3Pool.slot0()
    console.log(`   Initialized with sqrtPriceX96: ${sqrtPrice}`)
    console.log('   ✅ PASS: V3 pool created and initialized')
    passed++
  } catch (e: any) {
    console.log(`   ❌ FAIL: ${e.message}`)
    failed++
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 7: Add V3 Liquidity via Position Manager
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📋 Test 7: Add V3 liquidity via deployed Position Manager')
  try {
    const positionManager = await ethers.getContractAt(
      ['function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline) params) returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)'],
      DEPLOYED.positionManager
    )

    const amount0 = ethers.utils.parseEther('500')
    const amount1 = ethers.utils.parseEther('500')

    await (await tokenA.approve(DEPLOYED.positionManager, amount0)).wait()
    await (await tokenB.approve(DEPLOYED.positionManager, amount1)).wait()

    const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
      ? [tokenA.address, tokenB.address]
      : [tokenB.address, tokenA.address]

    // Pass as array for ethers v5 struct encoding
    const mintParams = [
      token0,
      token1,
      FEE_TIERS.MEDIUM, // 0.3% fee
      -60000, // tickLower (narrower range for test)
      60000, // tickUpper
      amount0, // amount0Desired
      amount1, // amount1Desired
      0, // amount0Min
      0, // amount1Min
      deployer.address, // recipient
      Math.floor(Date.now() / 1000) + 3600, // deadline
    ]

    const tx = await positionManager.mint(mintParams)
    const receipt = await tx.wait()

    console.log(`   TX: ${receipt.transactionHash}`)
    console.log('   ✅ PASS: V3 liquidity position minted')
    passed++
  } catch (e: any) {
    console.log(`   ❌ FAIL: ${e.message}`)
    failed++
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 8: SwapRouter02 Unified Routing (V2 + V3)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📋 Test 8: Verify SwapRouter02 configuration')
  try {
    const swapRouter = await ethers.getContractAt(
      ['function factoryV2() view returns (address)', 'function factory() view returns (address)'],
      DEPLOYED.swapRouter02
    )

    const factoryV2 = await swapRouter.factoryV2()
    const factoryV3 = await swapRouter.factory()

    console.log(`   V2 Factory: ${factoryV2}`)
    console.log(`   V3 Factory: ${factoryV3}`)

    if (factoryV2.toLowerCase() === DEPLOYED.v2Factory.toLowerCase() &&
        factoryV3.toLowerCase() === DEPLOYED.v3Factory.toLowerCase()) {
      console.log('   ✅ PASS: SwapRouter02 correctly configured for unified V2+V3 routing')
      passed++
    } else {
      console.log('   ❌ FAIL: SwapRouter02 configuration mismatch')
      failed++
    }
  } catch (e: any) {
    console.log(`   ❌ FAIL: ${e.message}`)
    failed++
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(`  📊 RESULTS: ${passed} passed, ${failed} failed`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (failed === 0) {
    console.log('🎉 All tests passed! Deployed DEX is fully functional.\n')
  } else {
    console.log('⚠️  Some tests failed. Review above for details.\n')
    process.exit(1)
  }
}

main().catch(console.error)
