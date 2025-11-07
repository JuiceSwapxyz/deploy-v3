import { ethers } from "ethers";
import axios from "axios";

async function verifyPoolOnCitrea() {
  const POOL_ADDRESS = "0xD8C7604176475eB8D350bC1EE452dA4442637C09";
  const TOKEN0 = "0x36c16eaC6B0Ba6c50f494914ff015fCa95B7835F"; // USDC
  const TOKEN1 = "0x4370e27F7d91D9341bFf232d7Ee8bdfE3a9933a0"; // WCBTC
  const FEE = 3000;
  const TICK_SPACING = 60;

  console.log("Attempting to verify pool contract on Citrea Explorer...");
  console.log("Pool Address:", POOL_ADDRESS);

  // Encode constructor arguments
  const abiCoder = new ethers.utils.AbiCoder();
  const constructorArgs = abiCoder
    .encode(
      ["address", "address", "uint24", "int24"],
      [TOKEN0, TOKEN1, FEE, TICK_SPACING]
    )
    .slice(2); // Remove 0x prefix

  // Try using hardhat verify
  console.log("\nRunning hardhat verification...");

  const { exec } = require("child_process");
  const util = require("util");
  const execPromise = util.promisify(exec);

  try {
    const verifyCommand = `npx hardhat verify --network citrea ${POOL_ADDRESS} ${TOKEN0} ${TOKEN1} ${FEE} ${TICK_SPACING}`;
    console.log("Command:", verifyCommand);

    const { stdout, stderr } = await execPromise(verifyCommand);
    console.log("Output:", stdout);
    if (stderr) console.error("Error output:", stderr);

  } catch (error) {
    console.log("\nHardhat verification failed, trying API approach...");

    // Alternative: Try direct API submission
    const apiUrl = "https://explorer.testnet.citrea.xyz/api/v2/smart-contracts/" + POOL_ADDRESS + "/verification/via/sourcify";

    const verificationData = {
      address: POOL_ADDRESS,
      chain_id: "5115",
      constructor_args: constructorArgs,
      compiler_version: "v0.7.6+commit.7338295f",
      optimization: true,
      optimization_runs: 1000000,
      contract_name: "UniswapV3Pool",
      evm_version: "istanbul",
    };

    console.log("\nTrying API verification with data:", verificationData);

    try {
      const response = await axios.post(apiUrl, verificationData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("API Response:", response.data);
    } catch (apiError: any) {
      console.log("API Error:", apiError.response?.data || apiError.message);

      // Provide manual instructions
      console.log("\n=== Manual Verification Instructions ===");
      console.log("Since automatic verification failed, please verify manually:");
      console.log("1. Go to: https://explorer.testnet.citrea.xyz/address/" + POOL_ADDRESS);
      console.log("2. Click on 'Contract' tab");
      console.log("3. Click on 'Verify & Publish'");
      console.log("4. Select:");
      console.log("   - Contract Name: UniswapV3Pool");
      console.log("   - Compiler: v0.7.6+commit.7338295f");
      console.log("   - Optimization: Yes (1000000 runs)");
      console.log("5. Constructor Arguments:", constructorArgs);
    }
  }
}

verifyPoolOnCitrea().catch(console.error);