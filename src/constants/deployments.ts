import * as fs from 'fs';
import * as path from 'path';

export interface DeploymentState {
  v2FactoryAddress: string;
  v2Router02Address: string;
  v3CoreFactoryAddress: string;
  swapRouter02: string;
  nonfungibleTokenPositionManagerAddress: string;
  quoterV2Address: string;
  multicall2Address: string;
  proxyAdminAddress: string;
  tickLensAddress: string;
  v3MigratorAddress: string;
  v3StakerAddress: string;
  descriptorProxyAddress: string;
  nftDescriptorLibraryAddressV1_3_0: string;
  nonfungibleTokenPositionDescriptorAddressV1_3_0: string;
}

export interface DeploymentFile {
  schemaVersion: string;
  network: {
    name: string;
    chainId: number;
  };
  deployment: {
    deployedAt: string;
    deployedBy: string;
    blockNumber: number;
  };
  contracts: DeploymentState;
  metadata: {
    deployer: string;
    deploymentMethod: string;
    scriptVersion: string;
  };
}

/**
 * Load deployment state for a given network
 * @param network - Network name (e.g., 'citreaTestnet', 'localhost')
 * @returns The deployment contracts state
 */
export function loadDeployment(network: string): DeploymentState {
  const filePath = path.resolve(__dirname, `../../deployments/${network}/dex.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment not found for network: ${network}. Expected file: ${filePath}`);
  }

  try {
    const data: DeploymentFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.contracts;
  } catch (e) {
    throw new Error(`Failed to parse deployment file for ${network}: ${e}`);
  }
}

/**
 * Check if a deployment exists for a given network
 */
export function deploymentExists(network: string): boolean {
  const filePath = path.resolve(__dirname, `../../deployments/${network}/dex.json`);
  return fs.existsSync(filePath);
}
