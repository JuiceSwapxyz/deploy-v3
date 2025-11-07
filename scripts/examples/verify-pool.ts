import { ethers } from 'ethers'
import * as fs from 'fs'
import * as path from 'path'

async function verifyPoolContract() {
  const POOL_ADDRESS = '0xD8C7604176475eB8D350bC1EE452dA4442637C09'
  const TOKEN0 = '0x36c16eaC6B0Ba6c50f494914ff015fCa95B7835F' // USDC
  const TOKEN1 = '0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0' // WCBTC 
  const FEE = 3000
  const TICK_SPACING = 60
  
  console.log('Pool Verification Information for Citrea Explorer')
  console.log('================================================')
  console.log('')
  console.log('Contract Address:', POOL_ADDRESS)
  console.log('')
  console.log('Constructor Arguments (ABI Encoded):')
  
  // Encode constructor arguments
  const abiCoder = new ethers.utils.AbiCoder()
  const constructorArgs = abiCoder.encode(
    ['address', 'address', 'uint24', 'int24'],
    [TOKEN0, TOKEN1, FEE, TICK_SPACING]
  )
  
  console.log(constructorArgs.slice(2)) // Remove 0x prefix
  console.log('')
  
  console.log('Verification Steps:')
  console.log('1. Go to: https://explorer.testnet.citrea.xyz/address/' + POOL_ADDRESS)
  console.log('2. Click on "Contract" tab')
  console.log('3. Click on "Verify & Publish"')
  console.log('4. Select:')
  console.log('   - Compiler Type: Solidity (Single file)')
  console.log('   - Compiler Version: v0.7.6+commit.7338295f')
  console.log('   - License: GPL-2.0-or-later')
  console.log('')
  console.log('5. Contract Source Code:')
  console.log('   Copy from: node_modules/@uniswap/v3-core/contracts/UniswapV3Pool.sol')
  console.log('   And all its dependencies')
  console.log('')
  console.log('6. Constructor Arguments:', constructorArgs.slice(2))
  console.log('')
  
  // Try to read the UniswapV3Pool source
  const poolSourcePath = path.join(__dirname, 'node_modules/@uniswap/v3-core/contracts/UniswapV3Pool.sol')
  if (fs.existsSync(poolSourcePath)) {
    console.log('7. Source file found at:', poolSourcePath)
  } else {
    console.log('7. Source file not found, check node_modules')
  }
}

verifyPoolContract()
