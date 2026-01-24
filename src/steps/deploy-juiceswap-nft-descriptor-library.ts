import JuiceSwapNFTDescriptor from '@juiceswapxyz/v3-periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json'
import createDeployLibraryStep from './meta/createDeployLibraryStep'

// Deploy JuiceSwap-branded NFTDescriptor library
// Modified from Uniswap V3 Periphery v1.3.0 with branding changes in metadata
// Reuses the same state key as vanilla Uniswap so it integrates seamlessly into the deployment flow
export const DEPLOY_JUICESWAP_NFT_DESCRIPTOR_LIBRARY = createDeployLibraryStep({
  key: 'nftDescriptorLibraryAddressV1_3_0',
  artifact: JuiceSwapNFTDescriptor,
})
