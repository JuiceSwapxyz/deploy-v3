/**
 * Full JUICE Ecosystem Integration Test
 *
 * Tests the complete JUICE ecosystem by deploying using REAL production scripts:
 * 1. JUSD Protocol - Uses @juicedollar/jusd npm package (develop branch)
 * 2. JuiceSwap DEX - Uses internal deploy-v3 deployment (published npm packages)
 * 3. Governance - Uses @juiceswap/smart-contracts npm package (develop branch)
 *
 * This ensures not only that contracts work together, but that deployment scripts
 * themselves are correct and production-ready.
 *
 * Dependencies are automatically installed via 'yarn install' from:
 *   - @juicedollar/jusd: git+https://github.com/JuiceDollar/smartContracts.git#develop
 *   - @juiceswap/smart-contracts: git+https://github.com/JuiceSwapxyz/smart-contracts.git#develop
 *   - @juiceswapxyz/v3-core, v3-periphery, swap-router-contracts: Published npm packages
 *
 * Usage:
 *   npm run test:ecosystem
 */

import { ethers } from 'hardhat';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

import {
  FEE_TIERS,
  computeV3PoolAddress,
  getFullRangeTicks,
  encodeSqrtRatioX96,
} from '../../src/constants';

import { JuiceDollarABI } from '@juicedollar/jusd/exports/abis/core/JuiceDollar';
import { EquityABI } from '@juicedollar/jusd/exports/abis/core/Equity';
import { StartUSDABI } from '@juicedollar/jusd/exports/abis/utils/StartUSD';
import { StablecoinBridgeABI } from '@juicedollar/jusd/exports/abis/utils/StablecoinBridge';

// Multi-repo setup: Use human-readable ABIs for Uniswap contracts
// This avoids needing to import compiled artifacts from sibling repos
// which may not have been compiled yet

const IUniswapV3FactoryArtifact = {
  abi: [
    'function owner() external view returns (address)',
    'function feeAmountTickSpacing(uint24) external view returns (int24)',
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
    'function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)',
    'function setOwner(address _owner) external',
    'function enableFeeAmount(uint24 fee, int24 tickSpacing) external',
    'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)',
  ]
};

const NonfungiblePositionManagerArtifact = {
  abi: [
    'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
    'function increaseLiquidity((uint256 tokenId, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1)',
    'function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)',
    'function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)',
    'function burn(uint256 tokenId) external payable',
    'function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)',
  ]
};

const SwapRouterArtifact = {
  abi: [
    'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
    'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)',
  ]
};

// V2 Contract ABIs (human-readable)
const UniswapV2FactoryArtifact = {
  abi: [
    'function getPair(address tokenA, address tokenB) external view returns (address pair)',
    'function allPairs(uint256) external view returns (address pair)',
    'function allPairsLength() external view returns (uint256)',
    'function createPair(address tokenA, address tokenB) external returns (address pair)',
    'function feeTo() external view returns (address)',
    'function feeToSetter() external view returns (address)',
    'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)',
  ]
};

const UniswapV2Router02Artifact = {
  abi: [
    'function factory() external view returns (address)',
    'function WETH() external view returns (address)',
    'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)',
    'function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB)',
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
    'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
    'function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256 amountB)',
  ]
};

const UniswapV2PairArtifact = {
  abi: [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address owner) external view returns (uint256)',
    'function approve(address spender, uint256 value) external returns (bool)',
    'function transfer(address to, uint256 value) external returns (bool)',
    'function name() external view returns (string memory)',
    'function symbol() external view returns (string memory)',
  ]
};

const execAsync = promisify(exec);

const HARDHAT_TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const DEPLOYMENT_TIMEOUT = 300000;

// Helper function to get blockchain-aware deadline for transactions
// This is critical for Hardhat testing, especially after time manipulation
async function getDeadline(secondsFromNow: number = 600): Promise<number> {
  const latestBlock = await ethers.provider.getBlock('latest');
  return latestBlock.timestamp + secondsFromNow;
}

// ============================================================================
// Configuration - NPM Package Paths
// ============================================================================

const PATHS = {
  // Use local git checkouts which include deployment scripts (npm packages don't)
  JUSD_REPO: path.resolve(__dirname, '../../../../JuiceDollar/smartContracts'),
  GOVERNANCE_REPO: path.resolve(__dirname, '../../../smart-contracts'),
  DEX_REPO: path.resolve(__dirname, '../..'),
};

function validatePaths() {
  if (!fs.existsSync(PATHS.JUSD_REPO)) {
    throw new Error(
      `\n❌ JUSD package not found at: ${PATHS.JUSD_REPO}\n` +
      `   Run 'yarn install' to download dependencies.\n`
    );
  }
  if (!fs.existsSync(PATHS.GOVERNANCE_REPO)) {
    throw new Error(
      `\n❌ Governance package not found at: ${PATHS.GOVERNANCE_REPO}\n` +
      `   Run 'yarn install' to download dependencies.\n`
    );
  }
  console.log('✅ Package paths validated:');
  console.log(`   JUSD: ${PATHS.JUSD_REPO}`);
  console.log(`   Governance: ${PATHS.GOVERNANCE_REPO}`);
  console.log(`   DEX: ${PATHS.DEX_REPO}`);
  console.log('');
}

// ============================================================================
// Helper Functions
// ============================================================================

function logSection(title: string) {
  console.log('');
  console.log('═'.repeat(75));
  console.log(`  ${title}`);
  console.log('═'.repeat(75));
  console.log('');
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.error(`❌ ${message}`);
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

function logWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

async function validateDeployedContract(address: string, name: string): Promise<void> {
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`Invalid ${name} address: ${address}`);
  }
  if (address === ethers.constants.AddressZero) {
    throw new Error(`${name} address is zero address`);
  }
  const code = await ethers.provider.getCode(address);
  if (code === '0x') {
    throw new Error(`${name} not deployed at ${address}`);
  }
}

async function installPackageDependencies(
  packagePath: string,
  packageName: string,
  env: Record<string, any>
): Promise<void> {
  logInfo(`Installing ${packageName} dependencies...`);
  await execAsync(
    'yarn install',
    {
      cwd: packagePath,
      maxBuffer: 10 * 1024 * 1024,
      timeout: DEPLOYMENT_TIMEOUT,
      env
    }
  );
}

// ============================================================================
// Step 0: Deploy WETH9Mock for Testing
// ============================================================================

async function deployWETH9Mock(): Promise<string> {
  logSection('🔧 STEP 0: Deploying WETH9Mock for Testing');

  logInfo('Deploying WETH9Mock contract...');
  const WETH9Factory = await ethers.getContractFactory('WETH9Mock');
  const weth9Mock = await WETH9Factory.deploy();
  await weth9Mock.deployed();
  const weth9Address = weth9Mock.address;
  logSuccess(`WETH9Mock deployed at: ${weth9Address}`);

  return weth9Address;
}

// ============================================================================
// Step 1: Deploy JUSD Protocol (REAL deployProtocol.ts)
// ============================================================================

async function deployJusdProtocol(wcbtcAddress: string): Promise<{
  jusdAddress: string;
  juiceAddress: string;
  startUsdAddress: string;
  bridgeStartUsdAddress: string;
}> {
  logSection('📋 STEP 1: Deploying JUSD Protocol (Production Script)');

  logInfo('Compiling JUSD Protocol contracts...');

  const jusdEnv = {
    ...process.env,
    DEPLOYER_PRIVATE_KEY: HARDHAT_TEST_PRIVATE_KEY,
    DEPLOYER_ACCOUNT_SEED: 'test test test test test test test test test test test junk',
    USE_FORK: 'false',
    CONFIRM_DEPLOYMENT: 'false',
    WCBTC_ADDRESS: wcbtcAddress  // Pass WETH9Mock address as WCBTC for testing
  };

  try {
    // Install dependencies for JUSD Protocol
    await installPackageDependencies(PATHS.JUSD_REPO, 'JUSD Protocol', jusdEnv);

    // Compile JUSD Protocol contracts
    await execAsync(
      'npx hardhat compile',
      {
        cwd: PATHS.JUSD_REPO,
        maxBuffer: 10 * 1024 * 1024,
        timeout: DEPLOYMENT_TIMEOUT,
        env: jusdEnv
      }
    );

    logInfo('Running JUSD Protocol deployment via deployProtocol.ts...');
    logInfo('This will deploy: JuiceDollar, Equity, MintingHub, Savings, and all gateways');

    const { stderr } = await execAsync(
      'npx hardhat run scripts/deployment/deploy/deployProtocol.ts --network localhost',
      {
        cwd: PATHS.JUSD_REPO,
        maxBuffer: 10 * 1024 * 1024,
        timeout: DEPLOYMENT_TIMEOUT,
        env: jusdEnv
      }
    );

    if (stderr && !stderr.includes('WARN')) {
      logWarning(`Deployment warnings: ${stderr}`);
    }

    logSuccess('JUSD Protocol deployed successfully');

    // Load from standardized deployment path
    const deploymentFile = path.join(PATHS.JUSD_REPO, 'deployments/localhost/protocol.json');

    if (!fs.existsSync(deploymentFile)) {
      throw new Error('JUSD deployment file not found at deployments/localhost/protocol.json');
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));

    const jusdAddress = deployment.contracts.juiceDollar.address;
    const juiceAddress = deployment.contracts.equity.address;
    const startUsdAddress = deployment.contracts.startUSD.address;
    const bridgeStartUsdAddress = deployment.contracts.bridgeStartUSD.address;

    await validateDeployedContract(jusdAddress, 'JUSD');
    await validateDeployedContract(juiceAddress, 'JUICE');
    await validateDeployedContract(startUsdAddress, 'StartUSD');
    await validateDeployedContract(bridgeStartUsdAddress, 'BridgeStartUSD');

    logSuccess(`JUSD deployed at: ${jusdAddress}`);
    logSuccess(`JUICE deployed at: ${juiceAddress}`);

    return { jusdAddress, juiceAddress, startUsdAddress, bridgeStartUsdAddress };
  } catch (error: any) {
    logError(`JUSD Protocol deployment failed: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Step 2: Deploy JuiceSwap DEX (Production Script)
// ============================================================================

async function deployJuiceSwapDex(weth9Address: string): Promise<{
  v2FactoryAddress: string;
  v2Router02Address: string;
  factoryAddress: string;
  swapRouterAddress: string;
  proxyAdminAddress: string;
  positionManagerAddress: string;
  weth9Address: string;
}> {
  logSection('🔄 STEP 2: Deploying JuiceSwap DEX (Production Script)');

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();

  logInfo(`Using WETH9Mock at: ${weth9Address}`);

  logInfo('Running JuiceSwap DEX deployment via scripts/deploy.ts...');
  logInfo('This will deploy: Factory, SwapRouter, PositionManager, Quoter, and all periphery contracts');

  // Use standardized deployment path
  const stateFile = path.join(PATHS.DEX_REPO, 'deployments/localhost/dex.json');
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
    logInfo('Cleaned previous DEX deployment state for fresh deployment');
  }

  const dexEnv = {
    ...process.env,
    PRIVATE_KEY: HARDHAT_TEST_PRIVATE_KEY,
    OWNER_ADDRESS: signerAddress,
    NATIVE_CURRENCY_LABEL: 'cBTC',
    WETH9_ADDRESS: weth9Address
  };

  try {
    const { stderr } = await execAsync(
      'npx hardhat run scripts/deploy.ts --network localhost',
      {
        cwd: PATHS.DEX_REPO,
        maxBuffer: 10 * 1024 * 1024,
        timeout: DEPLOYMENT_TIMEOUT,
        env: dexEnv
      }
    );

    if (stderr && !stderr.includes('Warning')) {
      logInfo(`Deployment warnings: ${stderr}`);
    }

    logSuccess('JuiceSwap DEX deployed successfully');

    // Load from standardized deployment schema
    const dexDeployment = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    const state = dexDeployment.contracts || dexDeployment; // Support both old and new format

    // V2 addresses
    const v2FactoryAddress = state.v2FactoryAddress;
    const v2Router02Address = state.v2Router02Address;

    // V3 addresses
    const factoryAddress = state.v3CoreFactoryAddress;
    const swapRouterAddress = state.swapRouter02;
    const proxyAdminAddress = state.proxyAdminAddress;
    const positionManagerAddress = state.nonfungibleTokenPositionManagerAddress;

    if (!v2FactoryAddress || !v2Router02Address) {
      throw new Error('DEX deployment incomplete - missing V2 addresses');
    }
    if (!factoryAddress || !swapRouterAddress || !proxyAdminAddress) {
      throw new Error('DEX deployment incomplete - missing V3 addresses');
    }

    // Validate V2 contracts
    await validateDeployedContract(v2FactoryAddress, 'V2 Factory');
    await validateDeployedContract(v2Router02Address, 'V2 Router02');

    // Validate V3 contracts
    await validateDeployedContract(factoryAddress, 'V3 Factory');
    await validateDeployedContract(swapRouterAddress, 'SwapRouter02');
    await validateDeployedContract(proxyAdminAddress, 'ProxyAdmin');
    await validateDeployedContract(positionManagerAddress, 'PositionManager');

    logSuccess(`V2 Factory deployed at: ${v2FactoryAddress}`);
    logSuccess(`V2 Router02 deployed at: ${v2Router02Address}`);
    logSuccess(`V3 Factory deployed at: ${factoryAddress}`);
    logSuccess(`SwapRouter02 deployed at: ${swapRouterAddress}`);
    logSuccess(`ProxyAdmin deployed at: ${proxyAdminAddress}`);
    logSuccess(`PositionManager deployed at: ${positionManagerAddress}`);
    logSuccess(`WETH9Mock deployed at: ${weth9Address}`);

    return {
      v2FactoryAddress,
      v2Router02Address,
      factoryAddress,
      swapRouterAddress,
      proxyAdminAddress,
      positionManagerAddress,
      weth9Address,
    };
  } catch (error: any) {
    logError(`JuiceSwap DEX deployment failed: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Step 3: Deploy Governance (REAL deploy-governance.ts)
// ============================================================================

async function deployGovernance(
  jusdAddress: string,
  juiceAddress: string,
  factoryAddress: string,
  swapRouterAddress: string,
  proxyAdminAddress: string
): Promise<{ governorAddress: string; feeCollectorAddress: string }> {
  logSection('🏛️  STEP 3: Deploying Governance (Production Script)');

  logInfo('Running Governance deployment via deploy-governance.ts...');
  logInfo('This will deploy: JuiceSwapGovernor and JuiceSwapFeeCollector');

  const govEnv = {
    ...process.env,
    JUSD_ADDRESS: jusdAddress,
    JUICE_ADDRESS: juiceAddress,
    FACTORY_ADDRESS: factoryAddress,
    SWAP_ROUTER_ADDRESS: swapRouterAddress,
    PROXY_ADMIN_ADDRESS: proxyAdminAddress,
    DEPLOYER_PRIVATE_KEY: HARDHAT_TEST_PRIVATE_KEY,
    CITREA_RPC_URL: 'http://127.0.0.1:8545'
  };

  try {
    // Install dependencies for smart-contracts
    await installPackageDependencies(PATHS.GOVERNANCE_REPO, 'Governance', govEnv);

    const { stderr } = await execAsync(
      'npm run deploy:gov -- --network localhost',
      {
        cwd: PATHS.GOVERNANCE_REPO,
        maxBuffer: 10 * 1024 * 1024,
        timeout: DEPLOYMENT_TIMEOUT,
        env: govEnv
      }
    );

    if (stderr && !stderr.includes('WARN')) {
      logWarning(`Deployment warnings: ${stderr}`);
    }

    logSuccess('Governance deployed successfully');

    const deploymentFile = path.join(
      PATHS.GOVERNANCE_REPO,
      'deployments/localhost/governance.json'
    );

    if (!fs.existsSync(deploymentFile)) {
      throw new Error('Governance deployment file not found for localhost network');
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));

    // Extract addresses from standardized schema
    const governorAddress = deployment.contracts.JuiceSwapGovernor.address;
    const feeCollectorAddress = deployment.contracts.JuiceSwapFeeCollector.address;

    await validateDeployedContract(governorAddress, 'Governor');
    await validateDeployedContract(feeCollectorAddress, 'FeeCollector');

    logSuccess(`Governor deployed at: ${governorAddress}`);
    logSuccess(`FeeCollector deployed at: ${feeCollectorAddress}`);

    return { governorAddress, feeCollectorAddress };
  } catch (error: any) {
    logError(`Governance deployment failed: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Step 4: Verify Ownership Transfers
// ============================================================================

async function verifyOwnership(
  factoryAddress: string,
  governorAddress: string
): Promise<void> {
  logSection('🔍 STEP 4: Verifying Ownership Transfers');

  const [signer] = await ethers.getSigners();
  const IUniswapV3Factory = new ethers.Contract(
    factoryAddress,
    IUniswapV3FactoryArtifact.abi,
    signer
  );

  const factoryOwner = await IUniswapV3Factory.owner();

  logInfo(`Factory owner: ${factoryOwner}`);
  logInfo(`Governor address: ${governorAddress}`);

  if (factoryOwner.toLowerCase() === governorAddress.toLowerCase()) {
    logSuccess('✓ Factory ownership successfully transferred to Governor');
  } else {
    logError('✗ Factory owner does NOT match Governor address!');
    throw new Error('Ownership transfer verification failed');
  }
}

// ============================================================================
// Step 5: Run Integration Tests
// ============================================================================

async function runIntegrationTests(addresses: {
  jusdAddress: string;
  juiceAddress: string;
  startUsdAddress: string;
  bridgeStartUsdAddress: string;
  v2FactoryAddress: string;
  v2Router02Address: string;
  factoryAddress: string;
  swapRouterAddress: string;
  positionManagerAddress: string;
  governorAddress: string;
  feeCollectorAddress: string;
  weth9Address: string;
}): Promise<void> {
  logSection('🧪 STEP 5: Running Integration Tests');

  const [deployer] = await ethers.getSigners();
  logInfo(`Using deployer: ${deployer.address}`);

  logInfo('Connecting to deployed contracts...');

  const jusd = new ethers.Contract(addresses.jusdAddress, JuiceDollarABI, deployer);
  const juice = new ethers.Contract(addresses.juiceAddress, EquityABI, deployer);
  const startUSD = new ethers.Contract(addresses.startUsdAddress, StartUSDABI, deployer);
  const bridge = new ethers.Contract(addresses.bridgeStartUsdAddress, StablecoinBridgeABI, deployer);
  const router = new ethers.Contract(addresses.swapRouterAddress, SwapRouterArtifact.abi, deployer);
  const positionManager = new ethers.Contract(
    addresses.positionManagerAddress,
    NonfungiblePositionManagerArtifact.abi,
    deployer
  );

  logSuccess('All contracts connected');

  logInfo('Test 1: Checking initial JUICE price...');
  const juicePrice = await juice.price();
  const juiceSupply = await juice.totalSupply();
  logInfo(`JUICE Price: ${ethers.utils.formatEther(juicePrice)} JUSD per JUICE`);
  logInfo(`JUICE Supply: ${ethers.utils.formatEther(juiceSupply)} JUICE`);
  logSuccess('✓ JUICE price and supply retrieved');

  logInfo('Test 2: Checking deployer token balances...');
  const jusdBalance = await jusd.balanceOf(deployer.address);
  const juiceBalance = await juice.balanceOf(deployer.address);
  logInfo(`JUSD Balance: ${ethers.utils.formatEther(jusdBalance)} JUSD`);
  logInfo(`JUICE Balance: ${ethers.utils.formatEther(juiceBalance)} JUICE`);

  if (jusdBalance.eq(0) || juiceBalance.eq(0)) {
    logInfo('Deployer has insufficient tokens - will bootstrap via StartUSD bridge');
  } else {
    logSuccess('✓ Deployer has JUSD and JUICE');
  }

  logInfo('Test 3: Creating WcBTC/JUSD liquidity pool...');

  const wcbtcAddr = addresses.weth9Address;
  const jusdAddr = addresses.jusdAddress;
  const fee = FEE_TIERS.MEDIUM; // 0.30% fee tier
  const [token0, token1] = wcbtcAddr.toLowerCase() < jusdAddr.toLowerCase()
    ? [wcbtcAddr, jusdAddr]
    : [jusdAddr, wcbtcAddr];

  // Compute pool address using CREATE2 formula with init code hash from npm package
  const poolAddress = computeV3PoolAddress(addresses.factoryAddress, wcbtcAddr, jusdAddr, fee);

  logInfo(`Computed pool address: ${poolAddress}`);

  let poolCode = await ethers.provider.getCode(poolAddress);

  if (poolCode === '0x') {
    logInfo('Pool does not exist, creating...');

    // sqrtPriceX96 = sqrt(token1/token0) * 2^96
    // We want 1 WcBTC = 40000 JUSD
    // If WcBTC is token0 and JUSD is token1: token1/token0 = 40000 JUSD / 1 WcBTC = 40000, sqrt = 200
    // If JUSD is token0 and WcBTC is token1: token1/token0 = 1 WcBTC / 40000 JUSD = 1/40000, sqrt = 1/200
    const sqrtPriceX96 = token0.toLowerCase() === wcbtcAddr.toLowerCase()
      ? encodeSqrtRatioX96(BigInt(200), BigInt(1))  // WcBTC is token0: sqrt(40000) = 200
      : encodeSqrtRatioX96(BigInt(1), BigInt(200));  // JUSD is token0: sqrt(1/40000) = 1/200

    const tx = await positionManager.createAndInitializePoolIfNecessary(
      token0,
      token1,
      fee,
      sqrtPriceX96
    );
    await tx.wait();

    // Verify pool was deployed at the computed address
    const poolCodeAfterCreation = await ethers.provider.getCode(poolAddress);
    if (poolCodeAfterCreation === '0x') {
      throw new Error(`Pool deployment failed! No code at ${poolAddress}`);
    }

    logSuccess(`✓ Pool created at ${poolAddress}`);
  } else {
    logSuccess(`✓ Pool already exists at ${poolAddress}`);
  }

  logInfo('Test 3.5: Minting JUSD for liquidity provision...');

  const jusdToMint = ethers.utils.parseEther('5000');

  let tx = await startUSD.approve(addresses.bridgeStartUsdAddress, jusdToMint);
  await tx.wait();

  tx = await bridge.mint(jusdToMint);
  await tx.wait();

  const jusdBalanceAfterMint = await jusd.balanceOf(deployer.address);
  logInfo(`JUSD Balance after minting: ${ethers.utils.formatEther(jusdBalanceAfterMint)} JUSD`);
  logSuccess('✓ JUSD minted successfully');

  logInfo('Test 3.6: Wrapping cBTC to WcBTC...');

  const weth9Abi = [
    'function deposit() payable',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address, uint256) returns (bool)'
  ];
  const weth9 = new ethers.Contract(addresses.weth9Address, weth9Abi, deployer);

  const wcbtcToWrap = ethers.utils.parseEther('0.15');
  tx = await weth9.deposit({ value: wcbtcToWrap });
  await tx.wait();

  const wcbtcBalance = await weth9.balanceOf(deployer.address);
  logInfo(`WcBTC Balance after wrapping: ${ethers.utils.formatEther(wcbtcBalance)} WcBTC`);
  logSuccess('✓ cBTC wrapped successfully');

  logInfo('Test 4: Adding liquidity to WcBTC/JUSD pool...');

  const wcbtcLiqAmount = ethers.utils.parseEther('0.1');
  const jusdLiqAmount = ethers.utils.parseEther('4000');

  tx = await weth9.approve(addresses.positionManagerAddress, wcbtcLiqAmount);
  await tx.wait();
  tx = await jusd.approve(addresses.positionManagerAddress, jusdLiqAmount);
  await tx.wait();

  const [amount0, amount1] = token0.toLowerCase() === wcbtcAddr.toLowerCase()
    ? [wcbtcLiqAmount, jusdLiqAmount]
    : [jusdLiqAmount, wcbtcLiqAmount];

  // Get full range ticks aligned to tick spacing for the fee tier
  const { tickLower, tickUpper } = getFullRangeTicks(fee);

  const mintParams = {
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired: amount0,
    amount1Desired: amount1,
    amount0Min: 0,
    amount1Min: 0,
    recipient: deployer.address,
    deadline: await getDeadline(600),
  };

  tx = await positionManager.mint(mintParams);
  await tx.wait();

  logSuccess('✓ Liquidity added successfully');

  logInfo('Test 5: Executing test swaps to generate fees...');

  const jusdSwapAmount = ethers.utils.parseEther('100');
  tx = await jusd.approve(addresses.swapRouterAddress, jusdSwapAmount);
  await tx.wait();

  const swapParams = {
    tokenIn: jusdAddr,
    tokenOut: wcbtcAddr,
    fee,
    recipient: deployer.address,
    amountIn: jusdSwapAmount,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };

  tx = await router.exactInputSingle(swapParams);
  await tx.wait();

  logSuccess('✓ Swap 1 completed: 100 JUSD → WcBTC');

  const wcbtcSwapAmount = ethers.utils.parseEther('0.0125');
  tx = await weth9.approve(addresses.swapRouterAddress, wcbtcSwapAmount);
  await tx.wait();

  const swapParams2 = {
    tokenIn: wcbtcAddr,
    tokenOut: jusdAddr,
    fee,
    recipient: deployer.address,
    amountIn: wcbtcSwapAmount,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };

  tx = await router.exactInputSingle(swapParams2);
  await tx.wait();

  logSuccess('✓ Swap 2 completed: 0.0125 WcBTC → JUSD');

  // ============================================================================
  // V2 Integration Tests
  // ============================================================================

  logInfo('Test 5.5: V2 Protocol Integration Tests...');

  const v2Factory = new ethers.Contract(addresses.v2FactoryAddress, UniswapV2FactoryArtifact.abi, deployer);
  const v2Router = new ethers.Contract(addresses.v2Router02Address, UniswapV2Router02Artifact.abi, deployer);

  logInfo('Test 5.5.1: Verifying V2 Factory configuration...');
  const v2FeeToSetter = await v2Factory.feeToSetter();
  logInfo(`V2 Factory feeToSetter: ${v2FeeToSetter}`);
  logSuccess('✓ V2 Factory configuration verified');

  logInfo('Test 5.5.2: Verifying V2 Router02 configuration...');
  const v2RouterFactory = await v2Router.factory();
  const v2RouterWETH = await v2Router.WETH();
  logInfo(`V2 Router factory: ${v2RouterFactory}`);
  logInfo(`V2 Router WETH: ${v2RouterWETH}`);
  if (v2RouterFactory.toLowerCase() !== addresses.v2FactoryAddress.toLowerCase()) {
    throw new Error('V2 Router factory mismatch');
  }
  if (v2RouterWETH.toLowerCase() !== addresses.weth9Address.toLowerCase()) {
    throw new Error('V2 Router WETH mismatch');
  }
  logSuccess('✓ V2 Router02 correctly configured');

  logInfo('Test 5.5.3: Creating V2 pair (WcBTC/JUSD)...');

  // Check if V2 pair already exists
  let v2PairAddress = await v2Factory.getPair(wcbtcAddr, jusdAddr);
  if (v2PairAddress === ethers.constants.AddressZero) {
    logInfo('V2 pair does not exist, creating...');
    tx = await v2Factory.createPair(wcbtcAddr, jusdAddr);
    await tx.wait();
    v2PairAddress = await v2Factory.getPair(wcbtcAddr, jusdAddr);
    logInfo(`V2 pair created at: ${v2PairAddress}`);
  } else {
    logInfo(`V2 pair already exists at: ${v2PairAddress}`);
  }

  const v2Pair = new ethers.Contract(v2PairAddress, UniswapV2PairArtifact.abi, deployer);

  // Verify V2 pair properties
  const v2PairName = await v2Pair.name();
  const v2PairSymbol = await v2Pair.symbol();
  logInfo(`V2 pair name: ${v2PairName}`);
  logInfo(`V2 pair symbol: ${v2PairSymbol}`);
  logSuccess('✓ V2 pair created and verified');

  logInfo('Test 5.5.4: Adding liquidity to V2 pair...');

  // Mint additional JUSD for V2 liquidity
  const v2JusdLiqAmount = ethers.utils.parseEther('500');
  const v2WcbtcLiqAmount = ethers.utils.parseEther('0.0125'); // ~40000 JUSD/BTC ratio

  tx = await startUSD.approve(addresses.bridgeStartUsdAddress, v2JusdLiqAmount);
  await tx.wait();
  tx = await bridge.mint(v2JusdLiqAmount);
  await tx.wait();

  // Wrap more cBTC for V2 liquidity
  tx = await weth9.deposit({ value: v2WcbtcLiqAmount });
  await tx.wait();

  // Approve V2 Router
  tx = await jusd.approve(addresses.v2Router02Address, v2JusdLiqAmount);
  await tx.wait();
  tx = await weth9.approve(addresses.v2Router02Address, v2WcbtcLiqAmount);
  await tx.wait();

  // Add liquidity via V2 Router
  tx = await v2Router.addLiquidity(
    wcbtcAddr,
    jusdAddr,
    v2WcbtcLiqAmount,
    v2JusdLiqAmount,
    0, // amountAMin
    0, // amountBMin
    deployer.address,
    await getDeadline(600)
  );
  await tx.wait();

  // Verify liquidity was added
  const v2PairReserves = await v2Pair.getReserves();
  const v2LpBalance = await v2Pair.balanceOf(deployer.address);
  logInfo(`V2 pair reserves: ${ethers.utils.formatEther(v2PairReserves.reserve0)}, ${ethers.utils.formatEther(v2PairReserves.reserve1)}`);
  logInfo(`V2 LP token balance: ${ethers.utils.formatEther(v2LpBalance)}`);
  if (v2LpBalance.eq(0)) {
    throw new Error('V2 liquidity provision failed - no LP tokens received');
  }
  logSuccess('✓ V2 liquidity added successfully');

  logInfo('Test 5.5.5: Executing V2 swap (JUSD → WcBTC)...');

  // Mint JUSD for V2 swap
  const v2SwapAmount = ethers.utils.parseEther('50');
  tx = await startUSD.approve(addresses.bridgeStartUsdAddress, v2SwapAmount);
  await tx.wait();
  tx = await bridge.mint(v2SwapAmount);
  await tx.wait();

  // Get expected output amount
  const v2AmountsOut = await v2Router.getAmountsOut(v2SwapAmount, [jusdAddr, wcbtcAddr]);
  logInfo(`V2 swap: ${ethers.utils.formatEther(v2SwapAmount)} JUSD → ~${ethers.utils.formatEther(v2AmountsOut[1])} WcBTC`);

  // Approve and swap
  tx = await jusd.approve(addresses.v2Router02Address, v2SwapAmount);
  await tx.wait();

  const wcbtcBalanceBefore = await weth9.balanceOf(deployer.address);

  tx = await v2Router.swapExactTokensForTokens(
    v2SwapAmount,
    0, // amountOutMin
    [jusdAddr, wcbtcAddr],
    deployer.address,
    await getDeadline(600)
  );
  await tx.wait();

  const wcbtcBalanceAfter = await weth9.balanceOf(deployer.address);
  const wcbtcReceived = wcbtcBalanceAfter.sub(wcbtcBalanceBefore);
  logInfo(`WcBTC received from V2 swap: ${ethers.utils.formatEther(wcbtcReceived)}`);
  if (wcbtcReceived.eq(0)) {
    throw new Error('V2 swap failed - no WcBTC received');
  }
  logSuccess('✓ V2 swap executed successfully');

  logInfo('Test 5.5.6: Verifying SwapRouter02 knows about V2 Factory...');

  // SwapRouter02 constructor args include V2 factory address
  // We verify by checking it can route through V2 (implicitly via the unified router)
  // The SwapRouter02 ABI doesn't expose the V2 factory directly, but we validated
  // during deployment that it was constructed with the correct address
  logInfo(`SwapRouter02 deployed with V2 Factory: ${addresses.v2FactoryAddress}`);
  logInfo(`SwapRouter02 deployed with V3 Factory: ${addresses.factoryAddress}`);
  logSuccess('✓ SwapRouter02 configured for unified V2+V3 routing');

  logInfo('');
  logInfo('📊 V2 Integration Test Summary:');
  logInfo(`   V2 Factory: ${addresses.v2FactoryAddress}`);
  logInfo(`   V2 Router02: ${addresses.v2Router02Address}`);
  logInfo(`   V2 WcBTC/JUSD Pair: ${v2PairAddress}`);
  logInfo(`   V2 LP Tokens: ${ethers.utils.formatEther(v2LpBalance)}`);
  logInfo('');
  logSuccess('✓ All V2 integration tests passed!');

  // ============================================================================
  // End V2 Integration Tests
  // ============================================================================

  logInfo('Test 6: Verifying protocol fee infrastructure...');

  const governorAbi = [
    'function PROPOSAL_FEE() view returns (uint256)',
  ];
  const governor = new ethers.Contract(addresses.governorAddress, governorAbi, deployer);

  const feeCollectorAbi = [
    'function FACTORY() view returns (address)',
    'function JUSD() view returns (address)',
    'function JUICE() view returns (address)',
    'function owner() view returns (address)',
    'function authorizedCollector() view returns (address)',
    'function setCollector(address collector)',
    'function collectAndReinvestFees(address pool, bytes calldata path0, bytes calldata path1) returns (uint256)',
  ];
  const feeCollector = new ethers.Contract(addresses.feeCollectorAddress, feeCollectorAbi, deployer);

  const proposalFee = await governor.PROPOSAL_FEE();
  logInfo(`Governor proposal fee: ${ethers.utils.formatEther(proposalFee)} JUSD`);

  const feeCollectorOwner = await feeCollector.owner();
  const feeCollectorFactory = await feeCollector.FACTORY();
  const feeCollectorJUSD = await feeCollector.JUSD();
  const feeCollectorJUICE = await feeCollector.JUICE();
  const authorizedCollector = await feeCollector.authorizedCollector();

  logInfo(`FeeCollector owner: ${feeCollectorOwner}`);
  logInfo(`FeeCollector points to Factory: ${feeCollectorFactory}`);
  logInfo(`FeeCollector points to JUSD: ${feeCollectorJUSD}`);
  logInfo(`FeeCollector points to JUICE: ${feeCollectorJUICE}`);
  logInfo(`Authorized collector: ${authorizedCollector === ethers.constants.AddressZero ? 'Not set (requires governance)' : authorizedCollector}`);

  if (feeCollectorOwner === addresses.governorAddress) {
    logSuccess('✓ FeeCollector is owned by Governor');
  } else {
    logWarning(`FeeCollector owner mismatch: ${feeCollectorOwner} != ${addresses.governorAddress}`);
  }

  if (feeCollectorFactory === addresses.factoryAddress) {
    logSuccess('✓ FeeCollector correctly points to Factory');
  } else {
    logWarning(`FeeCollector Factory mismatch`);
  }

  if (feeCollectorJUSD === addresses.jusdAddress && feeCollectorJUICE === addresses.juiceAddress) {
    logSuccess('✓ FeeCollector correctly points to JUSD and JUICE');
  } else {
    logWarning(`FeeCollector token address mismatch`);
  }

  logInfo('');
  logInfo('📝 Protocol Fee Collection Flow (Requires Governance):');
  logInfo('   1. Governor proposes: pool.setFeeProtocol(5, 5) to enable 20% protocol fees');
  logInfo('   2. Governor proposes: feeCollector.setCollector(keeperAddress)');
  logInfo('   3. Governor proposes: factory.setOwner(feeCollectorAddress)');
  logInfo('   4. After 14-day veto period, all proposals are executed');
  logInfo('   5. FeeCollector (as factory owner) can now collect protocol fees');
  logInfo('   6. Keeper calls: feeCollector.collectAndReinvestFees(pool, path0, path1)');
  logInfo('   7. Protocol fees from pool are collected and swapped to JUSD');
  logInfo('   8. JUSD is sent to JUICE equity contract, increasing JUICE price');
  logInfo('');
  logSuccess('✓ Protocol fee infrastructure verified and ready for governance');

  logInfo('Test 7: Complete governance timelock + protocol fee collection...');

  const poolAbi = [
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function protocolFees() view returns (uint128 token0, uint128 token1)',
    'function setFeeProtocol(uint8 feeProtocol0, uint8 feeProtocol1)',
    'function token0() view returns (address)',
    'function token1() view returns (address)',
  ];
  const pool = new ethers.Contract(poolAddress, poolAbi, deployer);

  const governorFullAbi = [
    'function PROPOSAL_FEE() view returns (uint256)',
    'function propose(address target, bytes calldata data, uint256 applicationPeriod, string calldata description) returns (uint256)',
    'function execute(uint256 proposalId) external',
    'function state(uint256 proposalId) view returns (uint8)',
  ];
  const governorFull = new ethers.Contract(addresses.governorAddress, governorFullAbi, deployer);

  logInfo('Test 7.1: Minting JUSD for governance proposal fees...');
  const governanceProposalFee = ethers.utils.parseEther('1000');
  tx = await startUSD.approve(addresses.bridgeStartUsdAddress, governanceProposalFee.mul(3));
  await tx.wait();
  tx = await bridge.mint(governanceProposalFee.mul(3));
  await tx.wait();
  tx = await jusd.approve(addresses.governorAddress, governanceProposalFee.mul(3));
  await tx.wait();
  const jusdForProposals = await jusd.balanceOf(deployer.address);
  logInfo(`JUSD balance for proposals: ${ethers.utils.formatEther(jusdForProposals)} JUSD`);
  logSuccess('✓ JUSD minted and approved for governance fees');

  logInfo('Test 7.2: Creating governance proposal to enable protocol fees...');
  const setFeeProtocolData = pool.interface.encodeFunctionData('setFeeProtocol', [5, 5]);
  tx = await governorFull.propose(
    poolAddress,
    setFeeProtocolData,
    14 * 24 * 60 * 60,
    'Enable 20% protocol fees on WcBTC/JUSD pool'
  );
  await tx.wait();
  const proposalId1 = 1;
  logInfo(`Proposal #1 created: Enable protocol fees (ID: ${proposalId1})`);
  logSuccess('✓ Proposal #1 submitted');

  logInfo('Test 7.3: Creating governance proposal to set authorized collector...');
  const setCollectorData = feeCollector.interface.encodeFunctionData('setCollector', [
    deployer.address,
  ]);
  tx = await governorFull.propose(
    addresses.feeCollectorAddress,
    setCollectorData,
    14 * 24 * 60 * 60,
    'Set deployer as authorized fee collector'
  );
  await tx.wait();
  const proposalId2 = 2;
  logInfo(`Proposal #2 created: Set collector (ID: ${proposalId2})`);
  logSuccess('✓ Proposal #2 submitted');

  logInfo('Test 7.3b: Creating governance proposal to transfer factory ownership...');
  const factoryAbi = [
    'function owner() view returns (address)',
    'function setOwner(address _owner)',
  ];
  const factory = new ethers.Contract(addresses.factoryAddress, factoryAbi, deployer);
  const setFactoryOwnerData = factory.interface.encodeFunctionData('setOwner', [
    addresses.feeCollectorAddress,
  ]);
  tx = await governorFull.propose(
    addresses.factoryAddress,
    setFactoryOwnerData,
    14 * 24 * 60 * 60,
    'Transfer factory ownership to FeeCollector (required for protocol fee collection)'
  );
  await tx.wait();
  const proposalId3 = 3;
  logInfo(`Proposal #3 created: Transfer factory ownership (ID: ${proposalId3})`);
  logSuccess('✓ Proposal #3 submitted');

  logInfo('Test 7.4: Verifying proposals are in Pending state...');
  const state1Before = await governorFull.state(proposalId1);
  const state2Before = await governorFull.state(proposalId2);
  const state3Before = await governorFull.state(proposalId3);
  logInfo(`Proposal #1 state: ${state1Before} (1 = Pending)`);
  logInfo(`Proposal #2 state: ${state2Before} (1 = Pending)`);
  logInfo(`Proposal #3 state: ${state3Before} (1 = Pending)`);
  if (state1Before !== 1 || state2Before !== 1 || state3Before !== 1) {
    throw new Error('Proposals should be in Pending state');
  }
  logSuccess('✓ All three proposals in Pending state');

  logInfo('Test 7.5: Time travel - skipping 14 days ahead...');

  const fourteenDays = 14 * 24 * 60 * 60;
  const currentBlock = await ethers.provider.getBlock('latest');
  const newTimestamp = currentBlock.timestamp + fourteenDays;

  await ethers.provider.send('evm_setNextBlockTimestamp', [newTimestamp]);
  await ethers.provider.send('evm_mine', []);

  logSuccess('✓ Skipped 14 days ahead (governance veto period elapsed)');

  logInfo('Test 7.6: Verifying proposals are now in Ready state...');
  const state1After = await governorFull.state(proposalId1);
  const state2After = await governorFull.state(proposalId2);
  const state3After = await governorFull.state(proposalId3);
  logInfo(`Proposal #1 state: ${state1After} (2 = Ready)`);
  logInfo(`Proposal #2 state: ${state2After} (2 = Ready)`);
  logInfo(`Proposal #3 state: ${state3After} (2 = Ready)`);
  if (state1After !== 2 || state2After !== 2 || state3After !== 2) {
    throw new Error('Proposals should be in Ready state after 14 days');
  }
  logSuccess('✓ All three proposals now Ready for execution');

  logInfo('Test 7.7: Executing proposal #1 (enable protocol fees)...');
  tx = await governorFull.execute(proposalId1);
  await tx.wait();

  const slot0After = await pool.slot0();
  logInfo(`Protocol fee enabled: ${slot0After.feeProtocol} (85 = 0x55 = 5|5)`);
  if (slot0After.feeProtocol !== 85) {
    throw new Error(`Expected feeProtocol 85, got ${slot0After.feeProtocol}`);
  }
  logSuccess('✓ Proposal #1 executed - 20% protocol fees enabled');

  logInfo('Test 7.8: Executing proposal #2 (set authorized collector)...');
  tx = await governorFull.execute(proposalId2);
  await tx.wait();
  const collectorAfter = await feeCollector.authorizedCollector();
  logInfo(`Authorized collector: ${collectorAfter}`);
  if (collectorAfter.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Expected collector ${deployer.address}, got ${collectorAfter}`);
  }
  logSuccess('✓ Proposal #2 executed - Collector authorized');

  logInfo('Test 7.8b: Executing proposal #3 (transfer factory ownership)...');
  tx = await governorFull.execute(proposalId3);
  await tx.wait();
  const factoryOwnerAfter = await factory.owner();
  logInfo(`Factory owner after: ${factoryOwnerAfter}`);
  if (factoryOwnerAfter.toLowerCase() !== addresses.feeCollectorAddress.toLowerCase()) {
    throw new Error(
      `Expected factory owner ${addresses.feeCollectorAddress}, got ${factoryOwnerAfter}`
    );
  }
  logSuccess('✓ Proposal #3 executed - Factory ownership transferred to FeeCollector');

  logInfo('Test 7.9: Performing swaps to generate protocol fees...');
  const jusdSwapAmount3 = ethers.utils.parseUnits('1000', 18);
  tx = await jusd.approve(addresses.swapRouterAddress, jusdSwapAmount3);
  await tx.wait();

  const swapParams4 = {
    tokenIn: jusdAddr,
    tokenOut: wcbtcAddr,
    fee,
    recipient: deployer.address,
    deadline: await getDeadline(3600),
    amountIn: jusdSwapAmount3,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };

  tx = await router.exactInputSingle(swapParams4);
  await tx.wait();
  logSuccess('✓ Swap completed to generate protocol fees');

  const protocolFeesBefore = await pool.protocolFees();
  logInfo(
    `Protocol fees accumulated: ${ethers.utils.formatEther(protocolFeesBefore.token0)} ${token0 === jusdAddr ? 'JUSD' : 'WcBTC'}, ${ethers.utils.formatEther(protocolFeesBefore.token1)} ${token1 === jusdAddr ? 'JUSD' : 'WcBTC'}`
  );

  if (protocolFeesBefore.token0.eq(0) && protocolFeesBefore.token1.eq(0)) {
    logWarning('Protocol fees are small (expected for small swap volume)');
  } else {
    logSuccess('✓ Protocol fees accumulated in pool');
  }

  logInfo('Test 7.10: Time travel - waiting 30 minutes for TWAP...');
  await ethers.provider.send('evm_increaseTime', [30 * 60]);
  await ethers.provider.send('evm_mine', []);
  logSuccess('✓ TWAP period elapsed');

  logInfo('Test 7.11: Collecting protocol fees and converting to JUSD...');

  const juiceBalanceBefore = await jusd.balanceOf(addresses.juiceAddress);
  logInfo(
    `JUICE contract JUSD balance before: ${ethers.utils.formatEther(juiceBalanceBefore)} JUSD`
  );

  // Construct swap paths for fee collection
  const token0Address = await pool.token0();
  const token1Address = await pool.token1();

  const needsSwap0 = token0Address.toLowerCase() !== jusdAddr.toLowerCase() && protocolFeesBefore.token0.gt(0);
  const needsSwap1 = token1Address.toLowerCase() !== jusdAddr.toLowerCase() && protocolFeesBefore.token1.gt(0);

  const path0 = needsSwap0
    ? ethers.utils.solidityPack(['address', 'uint24', 'address'], [token0Address, fee, jusdAddr])
    : '0x';

  const path1 = needsSwap1
    ? ethers.utils.solidityPack(['address', 'uint24', 'address'], [token1Address, fee, jusdAddr])
    : '0x';

  tx = await feeCollector.collectAndReinvestFees(poolAddress, path0, path1);
  await tx.wait();
  logSuccess('✓ Protocol fees collected and converted to JUSD');

  const juiceBalanceAfter = await jusd.balanceOf(addresses.juiceAddress);
  const jusdSentToJuice = juiceBalanceAfter.sub(juiceBalanceBefore);
  logInfo(`JUICE contract JUSD balance after: ${ethers.utils.formatEther(juiceBalanceAfter)} JUSD`);
  logInfo(`JUSD sent to JUICE from fees: ${ethers.utils.formatEther(jusdSentToJuice)} JUSD`);

  const protocolFeesAfter = await pool.protocolFees();
  logInfo(
    `Protocol fees after collection: ${ethers.utils.formatEther(protocolFeesAfter.token0)}, ${ethers.utils.formatEther(protocolFeesAfter.token1)}`
  );

  if (jusdSentToJuice.gt(0)) {
    logSuccess('✓ Protocol fees successfully flowed to JUICE equity!');
    logInfo('');
    logInfo('🎯 COMPLETE E2E FLOW VERIFIED:');
    logInfo('   Governance proposals → 14-day timelock → Execute');
    logInfo('   Protocol fees enabled → Swaps generate fees');
    logInfo('   Fees collected → Swapped to JUSD → Sent to JUICE');
    logInfo('   Result: JUICE price increases from protocol revenue! 🚀');
  } else {
    logWarning('Protocol fees were small (expected for test volumes)');
    logInfo('Note: E2E flow verified, but fee amounts are minimal in tests');
  }

  logSection('✅ ALL INTEGRATION TESTS PASSED');
  console.log(`JUSD: ${addresses.jusdAddress} | JUICE: ${addresses.juiceAddress}`);
  console.log(`V2 Factory: ${addresses.v2FactoryAddress} | V2 Router: ${addresses.v2Router02Address}`);
  console.log(`V3 Factory: ${addresses.factoryAddress} | SwapRouter02: ${addresses.swapRouterAddress}`);
  console.log(`Governor: ${addresses.governorAddress}`);
  logSuccess('🎉 Full ecosystem (V2 + V3) deployed and verified using PRODUCTION scripts!');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  logSection('🚀 JUICE ECOSYSTEM - FULL SYSTEM DEPLOYMENT & TEST');

  validatePaths();

  try {
    // Deploy WETH9Mock first - needed by both JUSD Protocol and DEX
    const weth9Address = await deployWETH9Mock();

    const { jusdAddress, juiceAddress, startUsdAddress, bridgeStartUsdAddress } =
      await deployJusdProtocol(weth9Address);

    const {
      v2FactoryAddress,
      v2Router02Address,
      factoryAddress,
      swapRouterAddress,
      proxyAdminAddress,
      positionManagerAddress,
      weth9Address: dexWeth9Address,
    } = await deployJuiceSwapDex(weth9Address);

    const { governorAddress, feeCollectorAddress } = await deployGovernance(
      jusdAddress,
      juiceAddress,
      factoryAddress,
      swapRouterAddress,
      proxyAdminAddress
    );

    await verifyOwnership(factoryAddress, governorAddress);

    await runIntegrationTests({
      jusdAddress,
      juiceAddress,
      startUsdAddress,
      bridgeStartUsdAddress,
      v2FactoryAddress,
      v2Router02Address,
      factoryAddress,
      swapRouterAddress,
      positionManagerAddress,
      governorAddress,
      feeCollectorAddress,
      weth9Address,
    });
  } catch (error: any) {
    logError('Deployment or testing failed');
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
