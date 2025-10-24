import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";

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
  networks: {
    citrea: {
      url: "https://rpc.testnet.citrea.xyz",
      chainId: 5115,
      accounts: ["0x6270e932efe97360cefa8b16e4db0b839b2dae8a0aa9d9d7f30fd753884a97ba"],
    },
  },
  etherscan: {
    apiKey: {
      citrea: "placeholder", // Citrea doesn't require API key
    },
    customChains: [
      {
        network: "citrea",
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