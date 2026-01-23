import { ethers } from 'ethers';

// Import bytecode from npm packages to compute hashes
import V3PoolArtifact from '@juiceswapxyz/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json';
import V2PairArtifact from '@juiceswapxyz/v2-core/artifacts/contracts/UniswapV2Pair.sol/UniswapV2Pair.json';

// Compute init code hashes from bytecode (single source of truth)
export const V3_POOL_INIT_CODE_HASH = ethers.utils.keccak256(V3PoolArtifact.bytecode);
export const V2_PAIR_INIT_CODE_HASH = ethers.utils.keccak256(V2PairArtifact.bytecode);

// Fee tiers (in hundredths of a bip, i.e., 3000 = 0.30%)
export const FEE_TIERS = {
  LOWEST: 100,   // 0.01%
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.30%
  HIGH: 10000,   // 1.00%
} as const;

// Tick spacing per fee tier
export const TICK_SPACINGS: Record<number, number> = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};

// Tick bounds (from Uniswap V3)
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

// Q96 = 2^96 (for sqrtPriceX96 calculations)
// Using literal value to avoid BigInt exponentiation issues in some environments
export const Q96 = BigInt('79228162514264337593543950336'); // 2^96

// 1:1 price as sqrtPriceX96
export const SQRT_PRICE_X96_ONE_TO_ONE = Q96; // sqrt(1) * 2^96

/**
 * Get full range ticks aligned to tick spacing for a given fee tier
 */
export function getFullRangeTicks(fee: number): { tickLower: number; tickUpper: number } {
  const tickSpacing = TICK_SPACINGS[fee];
  if (!tickSpacing) throw new Error(`Unknown fee tier: ${fee}`);
  const tickLower = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const tickUpper = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return { tickLower, tickUpper };
}

/**
 * Compute V3 pool address using CREATE2
 */
export function computeV3PoolAddress(
  factory: string,
  tokenA: string,
  tokenB: string,
  fee: number
): string {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];

  const salt = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint24'],
      [token0, token1, fee]
    )
  );

  return ethers.utils.getCreate2Address(factory, salt, V3_POOL_INIT_CODE_HASH);
}

/**
 * Compute V2 pair address using CREATE2
 */
export function computeV2PairAddress(
  factory: string,
  tokenA: string,
  tokenB: string
): string {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];

  const salt = ethers.utils.solidityKeccak256(['address', 'address'], [token0, token1]);
  return ethers.utils.getCreate2Address(factory, salt, V2_PAIR_INIT_CODE_HASH);
}

/**
 * Encode sqrt price ratio (from Uniswap SDK pattern)
 * sqrtPriceX96 = sqrt(amount1/amount0) * 2^96
 */
export function encodeSqrtRatioX96(amount1: bigint, amount0: bigint): bigint {
  const numerator = amount1 * Q96 * Q96;
  const ratioX192 = numerator / amount0;
  return sqrt(ratioX192);
}

/**
 * Babylonian square root for bigint
 */
function sqrt(value: bigint): bigint {
  if (value < BigInt(0)) throw new Error('sqrt of negative');
  if (value === BigInt(0)) return BigInt(0);
  let z = value;
  let x = value / BigInt(2) + BigInt(1);
  while (x < z) {
    z = x;
    x = (value / x + x) / BigInt(2);
  }
  return z;
}
