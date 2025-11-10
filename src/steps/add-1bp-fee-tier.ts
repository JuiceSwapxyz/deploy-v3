import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'
import { Contract } from '@ethersproject/contracts'
import { MigrationStep } from '../migrations'

const ONE_BP_FEE = 100
const ONE_BP_TICK_SPACING = 1

export const ADD_1BP_FEE_TIER: MigrationStep = async (state, { signer, maxFeePerGas, maxPriorityFeePerGas }) => {
  if (state.v3CoreFactoryAddress === undefined) {
    throw new Error('Missing JuiceSwapV3Factory')
  }

  const v3CoreFactory = new Contract(state.v3CoreFactoryAddress, UniswapV3Factory.abi, signer)

  const owner = await v3CoreFactory.owner()
  if (owner !== (await signer.getAddress())) {
    throw new Error('JuiceSwapV3Factory.owner is not signer')
  }

  // Check if fee tier is already enabled (skip logic for resumable deployments)
  const currentTickSpacing = await v3CoreFactory.feeAmountTickSpacing(ONE_BP_FEE)
  if (currentTickSpacing !== 0) {
    return [
      {
        message: `Fee tier ${ONE_BP_FEE / 100} bps with tick spacing ${ONE_BP_TICK_SPACING} is already enabled`,
      },
    ]
  }

  const tx = await v3CoreFactory.enableFeeAmount(ONE_BP_FEE, ONE_BP_TICK_SPACING, {
    maxFeePerGas,
    maxPriorityFeePerGas,
  })

  return [
    {
      message: `JuiceSwapV3Factory added a new fee tier ${ONE_BP_FEE / 100} bps with tick spacing ${ONE_BP_TICK_SPACING}`,
      hash: tx.hash,
    },
  ]
}
