pragma solidity ^0.4.17;

import './ERC20Token.sol';


contract RedeemableERC20Token is ERC20Token {

  mapping(address => bool) public isRedemptionTargetToken;
  event RedemptionTargetTokenSetByOwner(address indexed owner, address indexed targetToken, bool value);
  event Redeemed(address targetToken, address addr, uint256 balance);
  event RedeemedFrom(address tokenFrom, address addr, uint256 redeemAmount);

  function RedeemableERC20Token(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply)
    ERC20Token(_name, _symbol, _decimals, _totalSupply) public {
  }

  function setRedemptionTargetToken(address targetToken, bool value) public onlyOwner {
    isRedemptionTargetToken[targetToken] = value;
    RedemptionTargetTokenSetByOwner(msg.sender, targetToken, value);
  }

  function redeemable() view public returns (bool) {
    return isRedemptionTargetToken[msg.sender];
  }

  function redeem(address addr) public returns (uint256) {
    require(redeemable());
    uint256 addr_balance = balances[addr];
    balances[addr] = 0;
    Redeemed(msg.sender, addr, addr_balance);
    return addr_balance;
  }

  function redeemableFrom(address _token) view public returns(bool) {
    RedeemableERC20Token token = RedeemableERC20Token(_token);
    return token.redeemable();
  }

  function redeemFrom(address _token) public returns (uint256) {
    RedeemableERC20Token token = RedeemableERC20Token(_token);
    uint256 redeemAmount = token.redeem(msg.sender);
    balances[msg.sender] = balances[msg.sender].add(redeemAmount);
    RedeemedFrom(_token, msg.sender, redeemAmount);
    return  redeemAmount;
  }
}
