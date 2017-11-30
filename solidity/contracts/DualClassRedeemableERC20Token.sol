pragma solidity ^0.4.18;

import './RedeemableERC20Token.sol';

contract DualClassRedeemableERC20Token is RedeemableERC20Token {

  /**
   * project founders are required to issue two classes of tokens:
   *
   * Class A — Issued and sold to regular investors during a token sale. Held by regular investor
   * with regular voting rights and eligibility for a refund.
   *
   * Class B — Not issued and sold to regular investors during a token sale, e.g., tokens held by
   * project founders, or tokens unsold during a token sale. No voting rights and ineligibility for
   * a refund.
   */
  bool isClassA;

  function DualClassRedeemableERC20Token(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply, bool _isClassA)
    RedeemableERC20Token(_name, _symbol, _decimals, _totalSupply) public {
    isClassA = _isClassA;
  }
}
