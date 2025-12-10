import UniswapV2Factory from '@juiceswapxyz/v2-core/artifacts/contracts/UniswapV2Factory.sol/UniswapV2Factory.json'
import createDeployContractStep from './meta/createDeployContractStep'

export const DEPLOY_V2_FACTORY = createDeployContractStep({
  key: 'v2FactoryAddress',
  artifact: UniswapV2Factory,
  computeArguments(_state, config) {
    // feeToSetter - can be transferred to governance later
    return [config.ownerAddress]
  },
})
