pragma solidity ^0.4.17;

import './ERC20Token.sol';


contract RedeemableERC20Token is ERC20Token {

  address public redemptionTargetToken;
  event RedemptionTargetTokenSetByOwner(address indexed owner, address indexed targetToken);
  event Redeemed(address targetToken, address addr, uint256 balance);
  event RedeemedFrom(address tokenFrom, address addr, uint256 redeemAmount);
  /**
   * construct VGTH token
   * Total Supply: 15% of VTH supply = 1.5e25 mVTH, or 1.5e7 VTH
   */
  function RedeemableERC20Token(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply)
    ERC20Token(_name, _symbol, _decimals, _totalSupply) public {

    redemptionTargetToken = address(0x0);
  }

  function setRedemptionTargetToken(address targetToken) public onlyOwner {
    redemptionTargetToken = targetToken;
    RedemptionTargetTokenSetByOwner(msg.sender, redemptionTargetToken);
  }

  function redeemable() view public returns (bool) {
    return (redemptionTargetToken != address(0x0)) && (msg.sender == redemptionTargetToken);
  }

  function redeem(address addr) public returns (uint256) {
    require(redeemable());
    uint256 addr_balance = balances[addr];
    balances[addr] = 0;
    Redeemed(redemptionTargetToken, addr, addr_balance);
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
