// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IEntryPoint.sol";
import "./P256Verifier.sol";

/**
 * @title WebAuthnAccount
 * @notice ERC-4337 compatible smart contract wallet with WebAuthn/Passkey authentication
 * @dev Uses P-256 (secp256r1) signatures from WebAuthn for transaction authorization
 */
contract WebAuthnAccount {
    using ECDSA for bytes32;

    // ERC-4337 EntryPoint
    IEntryPoint public immutable entryPoint;
    
    // P-256 Verifier for WebAuthn signatures
    P256Verifier public immutable p256Verifier;
    
    // Owner's WebAuthn public key (x, y coordinates)
    bytes32 public ownerX;
    bytes32 public ownerY;
    
    // Nonce for replay protection
    uint256 public nonce;

    // Events
    event Executed(address indexed target, uint256 value, bytes data);
    event OwnerUpdated(bytes32 newX, bytes32 newY);

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "Only EntryPoint");
        _;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "Only self");
        _;
    }

    constructor(
        IEntryPoint _entryPoint,
        P256Verifier _p256Verifier,
        bytes32 _ownerX,
        bytes32 _ownerY
    ) {
        entryPoint = _entryPoint;
        p256Verifier = _p256Verifier;
        ownerX = _ownerX;
        ownerY = _ownerY;
    }

    /**
     * @notice Execute a transaction from this wallet
     * @param dest Target address
     * @param value ETH value to send
     * @param func Calldata to execute
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyEntryPoint {
        _call(dest, value, func);
    }

    /**
     * @notice Execute multiple transactions in a batch
     * @param dest Array of target addresses
     * @param value Array of ETH values
     * @param func Array of calldata
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyEntryPoint {
        require(
            dest.length == func.length && dest.length == value.length,
            "Length mismatch"
        );
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    /**
     * @notice Validate UserOperation signature (ERC-4337)
     * @param userOp The UserOperation to validate
     * @param userOpHash Hash of the UserOperation
     * @param missingAccountFunds Funds to prefund the EntryPoint
     * @return validationData 0 if valid, 1 if invalid
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        // Verify WebAuthn signature
        bool valid = _validateWebAuthnSignature(userOpHash, userOp.signature);
        
        // Prefund EntryPoint if needed
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "Prefund failed");
        }
        
        return valid ? 0 : 1;
    }

    /**
     * @notice Validate WebAuthn signature
     * @param hash The message hash that was signed
     * @param signature Encoded WebAuthn signature (authenticatorData, clientDataJSON, r, s)
     */
    function _validateWebAuthnSignature(
        bytes32 hash,
        bytes calldata signature
    ) internal view returns (bool) {
        // Decode signature components
        (
            bytes memory authenticatorData,
            bytes memory clientDataJSON,
            bytes32 r,
            bytes32 s
        ) = abi.decode(signature, (bytes, bytes, bytes32, bytes32));

        // Reconstruct the signed message
        // WebAuthn signs: SHA256(authenticatorData || SHA256(clientDataJSON))
        bytes32 clientDataHash = sha256(clientDataJSON);
        bytes32 message = sha256(abi.encodePacked(authenticatorData, clientDataHash));

        // Verify P-256 signature
        return p256Verifier.verify(message, r, s, ownerX, ownerY);
    }

    /**
     * @notice Update owner's WebAuthn public key (for key rotation)
     * @param newX New public key X coordinate
     * @param newY New public key Y coordinate
     */
    function updateOwner(bytes32 newX, bytes32 newY) external onlySelf {
        ownerX = newX;
        ownerY = newY;
        emit OwnerUpdated(newX, newY);
    }

    /**
     * @notice Internal call execution
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit Executed(target, value, data);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}

// UserOperation struct for ERC-4337
struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}
