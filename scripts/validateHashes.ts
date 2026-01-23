import { validateInitCodeHashes } from '../src/constants/validation';

async function main() {
  console.log('Validating init code hashes...\n');
  validateInitCodeHashes();
  console.log('\nValidation complete!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
