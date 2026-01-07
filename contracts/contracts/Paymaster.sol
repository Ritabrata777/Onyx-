// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IEntryPoint.sol";

/**
 * @title Paymaster
 * @notice Sponsors gas fees for InvisibleRail users (gasless transactions)
 * @dev Simple verifying paymaster for demo purposes
 */
contract Paymaster {
    IEntryPoint public immutable entryPoint;
    address public owner;
    
    // Mapping of approved senders
    mapping(address => bool) public approvedSenders;
    
    // Daily spending limits per user
    mapping(address => uint256) public dailySpent;
    mapping(address => uint256) public lastSpendDay;
    uint256 public dailyLimit = 0.1 ether; // ~$0.10 in gas per day per user

    event Deposited(address indexed from, uint256 amount);
    event SenderApproved(address indexed sender, bool approved);
    event GasSponsored(address indexed sender, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        owner = msg.sender;
    }

    /**
     * @notice Deposit funds to EntryPoint for gas sponsorship
     */
    function deposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Approve/revoke a sender for gas sponsorship
     */
    function approveSender(address sender, bool approved) external onlyOwner {
        approvedSenders[sender] = approved;
        emit SenderApproved(sender, approved);
    }

    /**
     * @notice Set daily spending limit
     */
    function setDailyLimit(uint256 limit) external onlyOwner {
        dailyLimit = limit;
    }

    /**
     * @notice Validate paymaster UserOp (called by EntryPoint)
     * @dev Returns context and validation data
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData) {
        require(msg.sender == address(entryPoint), "Only EntryPoint");
        
        address sender = userOp.sender;
        
        // Check if sender is approved (or approve all for demo)
        // In production, implement proper verification
        
        // Check daily limit
        uint256 today = block.timestamp / 1 days;
        if (lastSpendDay[sender] < today) {
            dailySpent[sender] = 0;
            lastSpendDay[sender] = today;
        }
        
        require(dailySpent[sender] + maxCost <= dailyLimit, "Daily limit exceeded");
        
        // Return sender as context for postOp
        context = abi.encode(sender, maxCost);
        validationData = 0; // Valid
    }

    /**
     * @notice Post-operation callback (called by EntryPoint)
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external {
        require(msg.sender == address(entryPoint), "Only EntryPoint");
        
        (address sender, ) = abi.decode(context, (address, uint256));
        
        // Update daily spent
        dailySpent[sender] += actualGasCost;
        
        emit GasSponsored(sender, actualGasCost);
    }

    /**
     * @notice Withdraw funds from EntryPoint
     */
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        // Implementation would call entryPoint.withdrawTo
        to.transfer(amount);
    }

    /**
     * @notice Get balance in EntryPoint
     */
    function getDeposit() external view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    receive() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }
}

// UserOperation struct
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

enum PostOpMode {
    opSucceeded,
    opReverted,
    postOpReverted
}
