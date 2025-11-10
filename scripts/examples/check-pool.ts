import { ethers } from 'ethers'
import { abi as IUniswapV3FactoryABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json'
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'

async function checkPool() {
  const CITREA_RPC = 'https://rpc.testnet.citrea.xyz'
  const POOL_ADDRESS = '0xD8C7604176475eB8D350bC1EE452dA4442637C09'
  
  const provider = new ethers.providers.JsonRpcProvider(CITREA_RPC, 5115)
  
  // Check if it's a pool
  try {
    const pool = new ethers.Contract(POOL_ADDRESS, IUniswapV3PoolABI, provider)
    
    const [token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
      pool.token0(),
      pool.token1(),
      pool.fee(),
      pool.tickSpacing(),
      pool.maxLiquidityPerTick()
    ])
    
    console.log('Pool Details for:', POOL_ADDRESS)
    console.log('Token0:', token0)
    console.log('Token1:', token1)
    console.log('Fee:', fee)
    console.log('Tick Spacing:', tickSpacing)
    console.log('Max Liquidity Per Tick:', maxLiquidityPerTick.toString())
    
    // Get token symbols
    const ERC20_ABI = ["function symbol() view returns (string)"]
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider)
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider)
    
    const [symbol0, symbol1] = await Promise.all([
      token0Contract.symbol(),
      token1Contract.symbol()
    ])
    
    console.log('\nPair:', symbol0, '/', symbol1)
    
  } catch (error) {
    console.log('Error:', error.message)
  }
}

checkPool()
