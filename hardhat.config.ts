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
      chainId: process.env.FORK_TESTNET ? 5115 : process.env.FORK_MAINNET ? 4114 : 31337,
      allowUnlimitedContractSize: true,
      forking: process.env.FORK_TESTNET ? {
        url: process.env.CITREA_TESTNET_RPC || "https://rpc.testnet.citrea.xyz",
        enabled: true,
      } : process.env.FORK_MAINNET ? {
        url: process.env.CITREA_MAINNET_RPC || "https://rpc.mainnet.citrea.xyz",
        enabled: true,
      } : undefined,
      chains: {
        5115: { hardforkHistory: { shanghai: 0 } },
        4114: { hardforkHistory: { shanghai: 0 } },
      },
    },
    // Fork networks - connect to a running forked node started via:
    //   npm run node:fork:testnet  (testnet fork)
    //   npm run node:fork:mainnet  (mainnet fork)
    forkTestnet: {
      url: "http://127.0.0.1:8545",
      chainId: 5115,
      timeout: 300_000,
    },
    forkMainnet: {
      url: "http://127.0.0.1:8545",
      chainId: 4114,
      timeout: 300_000,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      // chainId is auto-detected from the running node
    },
    citreaTestnet: {
      url: "https://rpc.testnet.citrea.xyz",
      chainId: 5115,
      accounts: getPrivateKey() ? [getPrivateKey()!] : [],
      timeout: 300_000,
    },
    citrea: {
      url: "https://rpc.mainnet.citrea.xyz",
      chainId: 4114,
      accounts: getPrivateKey() ? [getPrivateKey()!] : [],
      timeout: 300_000,
    },
  },
  etherscan: {
    apiKey: {
      citreaTestnet: "no-api-key-needed",
      citrea: "no-api-key-needed",
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
      {
        network: "citrea",
        chainId: 4114,
        urls: {
          apiURL: "https://explorer.mainnet.citrea.xyz/api",
          browserURL: "https://explorer.mainnet.citrea.xyz",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};

export default config;