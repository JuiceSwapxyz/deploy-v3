import { loadFileJSON } from './utils/deployments';
import { run } from 'hardhat';
import * as dotenv from 'dotenv';
dotenv.config();


async function main() {
  if (!process.env.DEPLOYMENT_FILE_PATH) {
    console.error('DEPLOYMENT_FILE_PATH environment variable not set');
    process.exit(1);
  }

  const deployment = await loadFileJSON(process.env.DEPLOYMENT_FILE_PATH);
  console.log(`\nVerifying contracts from: ${process.env.DEPLOYMENT_FILE_PATH}`);
  console.log(`Network: ${deployment.network.name} (Chain ID: ${deployment.network.chainId})\n`);

  for (const [contractName, address] of Object.entries(deployment.contracts)) {
    await verifyContract(contractName, address);

    // avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Contract verification process completed!');
}

async function verifyContract(name: string, address: string) {
  console.log(`\nVerifying ${name} at ${address}...`);

  try {
    await run('verify:verify', {
      address: address,
      // Note: Sourcify doesn't require constructor arguments
      // Etherscan-compatible explorers may fail without them
      force: true,
    });
    console.log(`✓ ${name} verified successfully!`);
  } catch (error: any) {
    if (error.message.includes('Already Verified')) {
      console.log(`${name} is already verified.`);
    } else {
      console.error(`✗ Error verifying ${name}:`, error.message);
    }
  }
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error in verification script:', error);
    process.exit(1);
  });
