// Modified to use JuiceSwap's forked UniswapV3Factory with 50% max protocol fee support
import UniswapV3Factory from '@juiceswapxyz/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'
import createDeployContractStep from './meta/createDeployContractStep'

export const DEPLOY_V3_CORE_FACTORY = createDeployContractStep({
  key: 'v3CoreFactoryAddress',
  artifact: UniswapV3Factory,
})
