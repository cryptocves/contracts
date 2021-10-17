// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract Token is ERC20 {

    address public admin;
    address public marketplace;

    constructor() ERC20('CVE Token', 'CVE-ERC20') {
        admin = msg.sender;
    }

    /// @notice only marketplace and admin can reward
    function reward(address account, uint256 amount) public {
        if(msg.sender == marketplace || msg.sender == admin){
            _mint(account, amount);
            _approve(account, account, balanceOf(account));
        } else {
            revert("NOT_ALLOWED");
        }
    }

    /// @notice admin can set marketplace
    function setMarketplace(address _marketplace) external {
        require(msg.sender == admin, "ONLY_ADMIN");
        marketplace = _marketplace;
    }
}