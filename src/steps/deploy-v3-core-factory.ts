// Modified to use local UniswapV3Factory artifact with 50% max protocol fee support
import UniswapV3Factory from '../../artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'
import createDeployContractStep from './meta/createDeployContractStep'

export const DEPLOY_V3_CORE_FACTORY = createDeployContractStep({
  key: 'v3CoreFactoryAddress',
  artifact: UniswapV3Factory,
})
