import UniswapV2Router02 from '@juiceswapxyz/v2-periphery/artifacts/contracts/UniswapV2Router02.sol/UniswapV2Router02.json'
import createDeployContractStep from './meta/createDeployContractStep'

export const DEPLOY_V2_ROUTER_02 = createDeployContractStep({
  key: 'v2Router02Address',
  artifact: UniswapV2Router02,
  computeArguments(state, config) {
    if (state.v2FactoryAddress === undefined) {
      throw new Error('Missing V2 Factory address')
    }
    return [state.v2FactoryAddress, config.weth9Address]
  },
})
