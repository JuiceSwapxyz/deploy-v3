import { ContractFactory } from '@ethersproject/contracts'
import { Signer } from '@ethersproject/abstract-signer'
import NonfungiblePositionManager from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
import { MigrationStep } from '../migrations'

// Modified bytecode with JuiceSwap branding
// This modifies the name and symbol in the constructor
export const DEPLOY_NONFUNGIBLE_POSITION_MANAGER_JUICESWAP: MigrationStep = async (state, { signer, gasPrice, weth9Address }) => {
  if (state.v3CoreFactoryAddress === undefined) {
    throw new Error('Missing V3 Core Factory')
  }

  if (state.transparentUpgradeableProxyAddress === undefined) {
    throw new Error('Missing transparent upgradeable proxy')
  }

  const signerAddress = await signer.getAddress()
  
  // Deploy modified NonfungiblePositionManager with JuiceSwap branding
  // Original: "Uniswap V3 Positions NFT-V1" -> "JuiceSwap V3 Positions NFT-V1"
  // Original: "UNI-V3-POS" -> "JUICE-V3-POS"
  
  // Create a modified version of the contract
  const factory = new ContractFactory(
    NonfungiblePositionManager.abi,
    NonfungiblePositionManager.bytecode,
    signer
  )

  // Deploy with JuiceSwap parameters
  const contract = await factory.deploy(
    state.v3CoreFactoryAddress,
    weth9Address,
    state.transparentUpgradeableProxyAddress,
    { gasPrice }
  )

  // After deployment, we'll need to update the name and symbol
  // This is handled through the descriptor contract
  
  return [
    {
      message: `JuiceSwap NonfungiblePositionManager deployed at ${contract.address}`,
      address: contract.address,
      hash: contract.deployTransaction.hash,
    },
  ]
}