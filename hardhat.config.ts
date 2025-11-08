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

const config: HardhatUserConfig = {
  solidity: {
    compilers: [DEFAULT_COMPILER_SETTINGS],
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
      chainId: 1337,
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      // Use Hardhat's default test accounts for local testing
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