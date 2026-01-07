// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/utils/Create2.sol";
import "./WebAuthnAccount.sol";
import "./P256Verifier.sol";
import "./interfaces/IEntryPoint.sol";

/**
 * @title WebAuthnAccountFactory
 * @notice Factory for deploying WebAuthn-based smart contract wallets
 * @dev Uses CREATE2 for deterministic addresses
 */
contract WebAuthnAccountFactory {
    IEntryPoint public immutable entryPoint;
    P256Verifier public immutable p256Verifier;
    
    // Mapping to track deployed accounts
    mapping(bytes32 => address) public deployedAccounts;

    event AccountCreated(address indexed account, bytes32 indexed ownerX, bytes32 indexed ownerY);

    constructor(IEntryPoint _entryPoint, P256Verifier _p256Verifier) {
        entryPoint = _entryPoint;
        p256Verifier = _p256Verifier;
    }

    /**
     * @notice Create a new WebAuthn account
     * @param ownerX Public key X coordinate
     * @param ownerY Public key Y coordinate
     * @param salt Unique salt for CREATE2
     * @return account The deployed account address
     */
    function createAccount(
        bytes32 ownerX,
        bytes32 ownerY,
        uint256 salt
    ) external returns (address account) {
        bytes32 key = keccak256(abi.encodePacked(ownerX, ownerY, salt));
        
        // Return existing account if already deployed
        if (deployedAccounts[key] != address(0)) {
            return deployedAccounts[key];
        }

        // Deploy new account
        bytes memory bytecode = abi.encodePacked(
            type(WebAuthnAccount).creationCode,
            abi.encode(entryPoint, p256Verifier, ownerX, ownerY)
        );

        account = Create2.deploy(0, bytes32(salt), bytecode);
        deployedAccounts[key] = account;

        emit AccountCreated(account, ownerX, ownerY);
    }

    /**
     * @notice Get the counterfactual address for an account
     * @param ownerX Public key X coordinate
     * @param ownerY Public key Y coordinate
     * @param salt Unique salt for CREATE2
     * @return The predicted account address
     */
    function getAddress(
        bytes32 ownerX,
        bytes32 ownerY,
        uint256 salt
    ) external view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(WebAuthnAccount).creationCode,
            abi.encode(entryPoint, p256Verifier, ownerX, ownerY)
        );

        return Create2.computeAddress(bytes32(salt), keccak256(bytecode));
    }
}
