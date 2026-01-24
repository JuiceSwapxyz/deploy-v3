import * as fs from 'fs';
import * as path from 'path';

// Re-export types from canonical location
export type { DeploymentState, DeploymentFile } from '../../src/constants/deployments';
import type { DeploymentFile } from '../../src/constants/deployments';

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
