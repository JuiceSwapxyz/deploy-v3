import { ethers } from 'ethers'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Creates a wallet connected to Citrea Testnet
 *
 * Validates PRIVATE_KEY from environment variables and creates
 * a wallet instance connected to Citrea testnet RPC.
 *
 * @returns {ethers.Wallet} Wallet instance connected to Citrea testnet
 * @throws {Error} Exits process if PRIVATE_KEY is missing or invalid
 */
export function getCitreaWallet(): ethers.Wallet {
  const privateKey = process.env.PRIVATE_KEY

  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable is not set')
    console.error('Please set it in your .env file or export PRIVATE_KEY=your_key')
    process.exit(1)
  }

  // Validate private key format (64 hex chars after 0x)
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Error: Invalid private key format')
    console.error('Expected format: 0x followed by 64 hexadecimal characters')
    process.exit(1)
  }

  // Create provider connected to Citrea testnet
  const provider = new ethers.providers.JsonRpcProvider(
    'https://rpc.testnet.citreascan.com',
    5115
  )

  return new ethers.Wallet(privateKey, provider)
}

/**
 * Gets the validated private key from environment variables
 *
 * Useful for hardhat.config.ts where we need the key but not a full wallet.
 * Returns undefined if key is missing or invalid (doesn't exit process).
 *
 * @returns {string | undefined} Validated private key or undefined
 */
export function getPrivateKey(): string | undefined {
  const privateKey = process.env.PRIVATE_KEY

  if (privateKey && /^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return privateKey
  }

  return undefined
}
