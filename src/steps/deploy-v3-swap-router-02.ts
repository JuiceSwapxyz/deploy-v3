import SwapRouter02 from '@juiceswapxyz/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json'
import createDeployContractStep from './meta/createDeployContractStep'

export const DEPLOY_V3_SWAP_ROUTER_02 = createDeployContractStep({
  key: 'swapRouter02',
  artifact: SwapRouter02,
  computeArguments(state, config) {
    if (state.v3CoreFactoryAddress === undefined) {
      throw new Error('Missing V3 Core Factory')
    }
    if (state.nonfungibleTokenPositionManagerAddress === undefined) {
      throw new Error('Missing NFT manager')
    }

    // Use V2 factory from state (unified deployment) or fall back to config (legacy)
    const v2FactoryAddress = state.v2FactoryAddress || config.v2CoreFactoryAddress

    return [
      v2FactoryAddress,
      state.v3CoreFactoryAddress,
      state.nonfungibleTokenPositionManagerAddress,
      config.weth9Address,
    ]
  },
})
