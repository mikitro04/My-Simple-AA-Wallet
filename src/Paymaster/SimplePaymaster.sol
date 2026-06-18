// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEntryPoint} from
    "lib/account-abstraction/contracts/interfaces/IEntryPoint.sol";

import {PackedUserOperation} from
    "lib/account-abstraction/contracts/interfaces/PackedUserOperation.sol";

import {BasePaymaster} from
    "lib/account-abstraction/contracts/core/BasePaymaster.sol";

contract SimplePaymaster is BasePaymaster {
    constructor(address entryPoint)
        BasePaymaster(IEntryPoint(entryPoint), msg.sender)
    {}

    function _validatePaymasterUserOp(
        PackedUserOperation calldata,
        bytes32,
        uint256
    )
        internal
        override
        returns (bytes memory context, uint256 validationData)
    {
        // Approva tutte le UserOperations
        return ("", 0);
    }
}