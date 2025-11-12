import { ContractFactory } from '@ethersproject/contracts'
import { Signer } from '@ethersproject/abstract-signer'
import NonfungiblePositionManager from '@juiceswapxyz/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
import { MigrationStep } from '../migrations'

// Deploy JuiceSwap-branded NonfungiblePositionManager from v3-periphery fork
// Modified from Uniswap V3 Periphery v1.3.0 with branding changes:
// - NFT name: "Uniswap V3 Positions NFT-V1" -> "JuiceSwap V3 Positions NFT-V1"
// - NFT symbol: "UNI-V3-POS" -> "JUICE-V3-POS"
export const DEPLOY_NONFUNGIBLE_POSITION_MANAGER_JUICESWAP: MigrationStep = async (state, { signer, gasPrice, weth9Address }) => {
  if (state.nonfungibleTokenPositionManagerAddress === undefined) {
    if (state.v3CoreFactoryAddress === undefined) {
      throw new Error('Missing V3 Core Factory')
    }

    if (state.descriptorProxyAddress === undefined) {
      throw new Error('Missing NonfungibleTokenDescriptorProxyAddress')
    }

    // Deploy JuiceSwap-branded NonfungiblePositionManager
    const factory = new ContractFactory(
      NonfungiblePositionManager.abi,
      NonfungiblePositionManager.bytecode,
      signer
    )

    // Deploy with factory, WETH9, and descriptor addresses
    const contract = await factory.deploy(
      state.v3CoreFactoryAddress,
      weth9Address,
      state.descriptorProxyAddress,
      { gasPrice }
    )

    // Save address to state for subsequent migration steps
    state.nonfungibleTokenPositionManagerAddress = contract.address

    return [
      {
        message: `JuiceSwap NonfungiblePositionManager deployed at ${contract.address}`,
        address: contract.address,
        hash: contract.deployTransaction.hash,
      },
    ]
  } else {
    return [
      {
        message: `JuiceSwap NonfungiblePositionManager was already deployed`,
        address: state.nonfungibleTokenPositionManagerAddress,
      },
    ]
  }
}