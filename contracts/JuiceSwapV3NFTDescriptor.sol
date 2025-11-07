// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.7.6;
pragma abicoder v2;

interface IPositionDescriptor {
    function tokenURI(address positionManager, uint256 tokenId) external view returns (string memory);
}

contract JuiceSwapV3NFTDescriptor {
    string public constant name = "JuiceSwap V3 Positions NFT-V1";
    string public constant symbol = "JUICE-V3-POS";
    
    // This is a simplified descriptor that returns JuiceSwap branding
    // In production, this would need the full NFT descriptor implementation
    
    function tokenName() external pure returns (string memory) {
        return name;
    }
    
    function tokenSymbol() external pure returns (string memory) {
        return symbol;
    }
}