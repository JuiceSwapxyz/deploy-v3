import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import { getPrivateKey } from "./src/util/wallet";

// Compiler settings (matches Uniswap V3 production configuration)
const DEFAULT_COMPILER_SETTINGS = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 1000000,
    },
    metadata: {
      bytecodeHash: "none",
    },
  },
};

const LOW_OPTIMIZER_COMPILER_SETTINGS = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 2000,
    },
    metadata: {
      bytecodeHash: "none",
    },
  },
};

const LOWEST_OPTIMIZER_COMPILER_SETTINGS = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 1000, // Matches Uniswap V3
    },
    metadata: {
      bytecodeHash: "none",
    },
  },
};

// JuiceSwap V2 Core compiler settings (Solidity 0.5.16)
const V2_CORE_COMPILER_SETTINGS = {
  version: "0.5.16",
  settings: {
    optimizer: {
      enabled: true,
      runs: 999999,
    },
  },
};

// JuiceSwap V2 Periphery compiler settings (Solidity 0.6.6)
const V2_PERIPHERY_COMPILER_SETTINGS = {
  version: "0.6.6",
  settings: {
    optimizer: {
      enabled: true,
      runs: 999999,
    },
  },
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      DEFAULT_COMPILER_SETTINGS,
      V2_CORE_COMPILER_SETTINGS,
      V2_PERIPHERY_COMPILER_SETTINGS,
    ],
    overrides: {
      "contracts/libraries/NFTDescriptor.sol": LOWEST_OPTIMIZER_COMPILER_SETTINGS,
      "contracts/JuiceSwapNonfungiblePositionManager.sol": LOW_OPTIMIZER_COMPILER_SETTINGS,
    },
  },
  paths: {
    sources: "./contracts", // Only compile contracts in this directory
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: process.env.FORK_ENABLED === 'true' ? 5115 : 1337,
      allowUnlimitedContractSize: true,
      forking: process.env.FORK_ENABLED === 'true' ? {
        url: process.env.RPC_URL || 'https://rpc.testnet.citrea.xyz',
        enabled: true,
      } : undefined,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      // chainId is auto-detected from the running node
      // When using node:fork, it will be 5115 (Citrea); otherwise 1337
    },
    citreaTestnet: {
      url: "https://rpc.testnet.citrea.xyz",
      chainId: 5115,
      accounts: getPrivateKey() ? [getPrivateKey()!] : [],
      timeout: 300_000,
    },
  },
  etherscan: {
    apiKey: {
      citreaTestnet: "no-api-key-needed",
    },
    customChains: [
      {
        network: "citreaTestnet",
        chainId: 5115,
        urls: {
          apiURL: "https://explorer.testnet.citrea.xyz/api",
          browserURL: "https://explorer.testnet.citrea.xyz",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};

export default config;