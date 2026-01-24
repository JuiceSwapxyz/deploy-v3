import * as fs from 'fs';
import * as path from 'path';
import { V3_POOL_INIT_CODE_HASH, V2_PAIR_INIT_CODE_HASH } from './index';

// Expected hashes (for documentation and quick comparison)
// These values are pinned to specific versions of the npm packages
// Update these when npm packages are updated to new versions
const EXPECTED_V3_POOL_HASH = '0x851d77a45b8b9a205fb9f44cb829cceba85282714d2603d601840640628a3da7';
const EXPECTED_V2_PAIR_HASH = '0xdc3b9f52403077ec7261ad325e15f34e395cf7e2a5c3782098edb10a7599cc3e';

/**
 * Validate that computed init code hashes match expected values
 * This catches drift from npm package updates before deployment
 */
export function validateInitCodeHashes(): void {
  const computedV3Hash = V3_POOL_INIT_CODE_HASH;
  const computedV2Hash = V2_PAIR_INIT_CODE_HASH;

  console.log('V3 Pool Init Code Hash:');
  console.log(`  Computed: ${computedV3Hash}`);
  console.log(`  Expected: ${EXPECTED_V3_POOL_HASH}`);

  console.log('');
  console.log('V2 Pair Init Code Hash:');
  console.log(`  Computed: ${computedV2Hash}`);
  console.log(`  Expected: ${EXPECTED_V2_PAIR_HASH}`);

  let hasErrors = false;

  if (computedV3Hash !== EXPECTED_V3_POOL_HASH) {
    hasErrors = true;
    console.error(
      `\nERROR: V3 Pool init code hash mismatch!\n` +
      `  Computed: ${computedV3Hash}\n` +
      `  Expected: ${EXPECTED_V3_POOL_HASH}\n` +
      `  This may indicate @juiceswapxyz/v3-core was updated.\n` +
      `  If intentional, update EXPECTED_V3_POOL_HASH in src/constants/validation.ts`
    );
  }

  if (computedV2Hash !== EXPECTED_V2_PAIR_HASH) {
    hasErrors = true;
    console.error(
      `\nERROR: V2 Pair init code hash mismatch!\n` +
      `  Computed: ${computedV2Hash}\n` +
      `  Expected: ${EXPECTED_V2_PAIR_HASH}\n` +
      `  This may indicate @juiceswapxyz/v2-core was updated.\n` +
      `  If intentional, update EXPECTED_V2_PAIR_HASH in src/constants/validation.ts`
    );
  }

  // Verify V3 hash matches what's hardcoded in v3-periphery's PoolAddress.sol
  const peripheryPackagePath = path.dirname(
    require.resolve('@juiceswapxyz/v3-periphery/package.json')
  );
  const poolAddressPath = path.join(
    peripheryPackagePath,
    'contracts/libraries/PoolAddress.sol'
  );
  const poolAddressSource = fs.readFileSync(poolAddressPath, 'utf-8');
  const hashMatch = poolAddressSource.match(/POOL_INIT_CODE_HASH\s*=\s*(0x[a-fA-F0-9]{64})/);

  if (!hashMatch) {
    hasErrors = true;
    console.error('\nERROR: Could not find POOL_INIT_CODE_HASH in v3-periphery/PoolAddress.sol');
  } else {
    const peripheryHash = hashMatch[1].toLowerCase();
    console.log('');
    console.log('V3 Pool Hash in v3-periphery/PoolAddress.sol:');
    console.log(`  Found: ${peripheryHash}`);

    if (computedV3Hash.toLowerCase() !== peripheryHash) {
      hasErrors = true;
      console.error(
        `\nERROR: V3 Pool hash mismatch between v3-core bytecode and v3-periphery!\n` +
        `  v3-core bytecode: ${computedV3Hash}\n` +
        `  v3-periphery:     ${peripheryHash}\n` +
        `  The npm packages are out of sync!`
      );
    }
  }

  if (hasErrors) {
    throw new Error('Init code hash validation failed. See errors above.');
  }

  console.log('\nAll init code hashes validated successfully!');
}
