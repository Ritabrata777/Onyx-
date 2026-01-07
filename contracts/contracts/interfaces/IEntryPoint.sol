// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IEntryPoint
 * @notice Minimal interface for ERC-4337 EntryPoint
 */
interface IEntryPoint {
    function getNonce(address sender, uint192 key) external view returns (uint256);
    
    function depositTo(address account) external payable;
    
    function balanceOf(address account) external view returns (uint256);
}
