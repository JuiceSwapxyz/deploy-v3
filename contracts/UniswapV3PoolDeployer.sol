// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.7.6;

// Modified from Uniswap V3 Core v1.0.0
// Source: https://github.com/Uniswap/v3-core/blob/v1.0.0/contracts/UniswapV3PoolDeployer.sol
// Changes:
//   1. Interface import uses @uniswap/v3-core package (line 11); modified Pool uses relative import (line 13)
//   2. Recompiled to use modified UniswapV3Pool (50% max protocol fee)
// All other code unchanged from Uniswap v1.0.0

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3PoolDeployer.sol';

import './UniswapV3Pool.sol';

contract UniswapV3PoolDeployer is IUniswapV3PoolDeployer {
    struct Parameters {
        address factory;
        address token0;
        address token1;
        uint24 fee;
        int24 tickSpacing;
    }

    /// @inheritdoc IUniswapV3PoolDeployer
    Parameters public override parameters;

    /// @dev Deploys a pool with the given parameters by transiently setting the parameters storage slot and then
    /// clearing it after deploying the pool.
    /// @param factory The contract address of the Uniswap V3 factory
    /// @param token0 The first token of the pool by address sort order
    /// @param token1 The second token of the pool by address sort order
    /// @param fee The fee collected upon every swap in the pool, denominated in hundredths of a bip
    /// @param tickSpacing The spacing between usable ticks
    function deploy(
        address factory,
        address token0,
        address token1,
        uint24 fee,
        int24 tickSpacing
    ) internal returns (address pool) {
        parameters = Parameters({factory: factory, token0: token0, token1: token1, fee: fee, tickSpacing: tickSpacing});
        pool = address(new UniswapV3Pool{salt: keccak256(abi.encode(token0, token1, fee))}());
        delete parameters;
    }
}
