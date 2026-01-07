// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title P256Verifier
 * @notice Verifies P-256 (secp256r1) signatures used by WebAuthn/Passkeys
 * @dev Uses RIP-7212 precompile when available, falls back to Solidity implementation
 */
contract P256Verifier {
    // RIP-7212 precompile address (available on some L2s)
    address constant P256_PRECOMPILE = 0x0000000000000000000000000000000000000100;
    
    // P-256 curve parameters
    uint256 constant P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF;
    uint256 constant N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551;
    uint256 constant A = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC;
    uint256 constant B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B;
    uint256 constant GX = 0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296;
    uint256 constant GY = 0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5;

    /**
     * @notice Verify a P-256 signature
     * @param message The message hash (32 bytes)
     * @param r Signature r component
     * @param s Signature s component
     * @param x Public key x coordinate
     * @param y Public key y coordinate
     * @return True if signature is valid
     */
    function verify(
        bytes32 message,
        bytes32 r,
        bytes32 s,
        bytes32 x,
        bytes32 y
    ) external view returns (bool) {
        // Try precompile first (more gas efficient)
        if (_tryPrecompile(message, r, s, x, y)) {
            return true;
        }
        
        // Fallback to Solidity implementation
        return _verifySolidity(
            uint256(message),
            uint256(r),
            uint256(s),
            uint256(x),
            uint256(y)
        );
    }

    /**
     * @notice Try to use RIP-7212 precompile
     */
    function _tryPrecompile(
        bytes32 message,
        bytes32 r,
        bytes32 s,
        bytes32 x,
        bytes32 y
    ) internal view returns (bool) {
        bytes memory input = abi.encodePacked(message, r, s, x, y);
        
        (bool success, bytes memory result) = P256_PRECOMPILE.staticcall(input);
        
        if (success && result.length == 32) {
            return abi.decode(result, (uint256)) == 1;
        }
        
        return false;
    }

    /**
     * @notice Solidity P-256 signature verification
     * @dev Based on https://github.com/daimo-eth/p256-verifier
     */
    function _verifySolidity(
        uint256 message,
        uint256 r,
        uint256 s,
        uint256 x,
        uint256 y
    ) internal pure returns (bool) {
        // Check signature bounds
        if (r == 0 || r >= N || s == 0 || s >= N) {
            return false;
        }

        // Check public key is on curve
        if (!_isOnCurve(x, y)) {
            return false;
        }

        // Compute s^-1 mod n
        uint256 sInv = _modInverse(s, N);

        // Compute u1 = message * s^-1 mod n
        uint256 u1 = mulmod(message, sInv, N);

        // Compute u2 = r * s^-1 mod n
        uint256 u2 = mulmod(r, sInv, N);

        // Compute point R = u1*G + u2*Q
        (uint256 rx, ) = _ecAdd(
            _ecMul(GX, GY, u1),
            _ecMul(x, y, u2)
        );

        // Verify r == rx mod n
        return r == (rx % N);
    }

    /**
     * @notice Check if point is on the P-256 curve
     */
    function _isOnCurve(uint256 x, uint256 y) internal pure returns (bool) {
        if (x >= P || y >= P) {
            return false;
        }
        
        uint256 lhs = mulmod(y, y, P);
        uint256 rhs = addmod(
            addmod(mulmod(mulmod(x, x, P), x, P), mulmod(A, x, P), P),
            B,
            P
        );
        
        return lhs == rhs;
    }

    /**
     * @notice Modular inverse using extended Euclidean algorithm
     */
    function _modInverse(uint256 a, uint256 m) internal pure returns (uint256) {
        if (a == 0) return 0;
        
        uint256 t1;
        uint256 t2 = 1;
        uint256 r1 = m;
        uint256 r2 = a;
        uint256 q;
        
        while (r2 != 0) {
            q = r1 / r2;
            (t1, t2, r1, r2) = (t2, addmod(t1, m - mulmod(q, t2, m), m), r2, r1 - q * r2);
        }
        
        return t1;
    }

    /**
     * @notice Elliptic curve point multiplication (simplified)
     */
    function _ecMul(uint256 x, uint256 y, uint256 k) internal pure returns (uint256, uint256) {
        // Double-and-add algorithm (simplified for demo)
        // In production, use optimized implementation
        uint256 rx = 0;
        uint256 ry = 0;
        uint256 tx = x;
        uint256 ty = y;
        
        while (k > 0) {
            if (k & 1 == 1) {
                (rx, ry) = _ecAddPoints(rx, ry, tx, ty);
            }
            (tx, ty) = _ecDouble(tx, ty);
            k >>= 1;
        }
        
        return (rx, ry);
    }

    /**
     * @notice Elliptic curve point addition
     */
    function _ecAdd(
        (uint256, uint256) memory p1,
        (uint256, uint256) memory p2
    ) internal pure returns (uint256, uint256) {
        return _ecAddPoints(p1.0, p1.1, p2.0, p2.1);
    }

    function _ecAddPoints(
        uint256 x1,
        uint256 y1,
        uint256 x2,
        uint256 y2
    ) internal pure returns (uint256, uint256) {
        if (x1 == 0 && y1 == 0) return (x2, y2);
        if (x2 == 0 && y2 == 0) return (x1, y1);
        
        uint256 lambda;
        if (x1 == x2) {
            if (y1 != y2) return (0, 0); // Point at infinity
            // Point doubling
            lambda = mulmod(
                addmod(mulmod(3, mulmod(x1, x1, P), P), A, P),
                _modInverse(mulmod(2, y1, P), P),
                P
            );
        } else {
            // Point addition
            lambda = mulmod(
                addmod(y2, P - y1, P),
                _modInverse(addmod(x2, P - x1, P), P),
                P
            );
        }
        
        uint256 x3 = addmod(mulmod(lambda, lambda, P), P - addmod(x1, x2, P), P);
        uint256 y3 = addmod(mulmod(lambda, addmod(x1, P - x3, P), P), P - y1, P);
        
        return (x3, y3);
    }

    function _ecDouble(uint256 x, uint256 y) internal pure returns (uint256, uint256) {
        return _ecAddPoints(x, y, x, y);
    }
}
