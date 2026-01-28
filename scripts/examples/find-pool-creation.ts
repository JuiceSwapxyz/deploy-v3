import { ethers } from 'ethers'
import { abi as IUniswapV3FactoryABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json'

async function findPoolCreation() {
  const CITREA_RPC = 'https://rpc.testnet.citreascan.com'
  const FACTORY_ADDRESS = '0x6832283eEA5a9A3C4384A5D9a06Db0ce6FE9C79E'
  const POOL_ADDRESS = '0xD8C7604176475eB8D350bC1EE452dA4442637C09'
  
  const provider = new ethers.providers.JsonRpcProvider(CITREA_RPC, 5115)
  const factory = new ethers.Contract(FACTORY_ADDRESS, IUniswapV3FactoryABI, provider)
  
  // Get pool from factory
  const token0 = '0x36c16eaC6B0Ba6c50f494914ff015fCa95B7835F' // USDC
  const token1 = '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0' // WCBTC
  const fee = 3000
  
  const poolFromFactory = await factory.getPool(token0, token1, fee)
  console.log('Pool from factory:', poolFromFactory)
  console.log('Target pool:', POOL_ADDRESS)
  console.log('Match:', poolFromFactory.toLowerCase() === POOL_ADDRESS.toLowerCase())
  
  // Search for PoolCreated event
  const filter = factory.filters.PoolCreated(null, null, null, null, POOL_ADDRESS)
  const events = await factory.queryFilter(filter, 0, 'latest')
  
  if (events.length > 0) {
    console.log('\nFound creation event:')
    console.log('Block:', events[0].blockNumber)
    console.log('Transaction:', events[0].transactionHash)
  } else {
    console.log('\nNo direct creation event found for this pool address')
  }
}

findPoolCreation()
