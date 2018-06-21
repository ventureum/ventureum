pragma solidity ^0.4.24;

import "vetx-token/contracts/VetXToken.sol";


contract MockedSale {
    VetXToken token; 

    constructor(address tokenAddr) public {
        token = VetXToken(tokenAddr);
    }

    function purchaseTokens() public payable {
        // uint tokenPurchase = msg.value * 1000;
        require (msg.value <= token.balanceOf(this));
        token.transfer(msg.sender, msg.value);
    }

    function getTokenAddr() external view returns (address){
        return address(token);
    }
    
    function getBalance(address someone) external view returns(uint){
        return token.balanceOf(someone);
    }
}
