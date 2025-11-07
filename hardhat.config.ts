import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import { getPrivateKey } from "./src/util/wallet";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
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
    },
  },
  etherscan: {
    apiKey: {
      citreaTestnet: "placeholder", // Citrea doesn't require API key
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
};

export default config;