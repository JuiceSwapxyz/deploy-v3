import * as fs from 'fs';
import * as path from 'path';

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
  contracts: Record<string, string>; // contract name -> address
  metadata: {
    deployer: string;
    deploymentMethod?: string;
    scriptVersion: string;
  };
}

/**
 * Load a deployment JSON file
 * @param filePath - Path to the deployment JSON file
 * @returns Parsed deployment data
 */
export async function loadFileJSON(filePath: string): Promise<DeploymentFile> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Deployment file not found: ${absolutePath}`);
  }

  const fileContents = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(fileContents);
}
