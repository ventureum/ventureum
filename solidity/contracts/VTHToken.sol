pragma solidity ^0.4.11;

import './ERC20Token.sol';
import './SafeMath.sol';

/**
 * construct VTH token.
 */
contract VTHToken is ERC20Token {

  // a set of tokens from which we can redeem VTH tokens
  mapping(address => bool) redemptionTokens;

  // for each token contract, each address can only be redeemed once
  mapping(address => mapping(address => bool)) redeemed;

  // token class
  bool classA;

  function VTHToken(bool _classA) ERC20Token('Ventureum Network Token',
                                 'VTH',
                                 18,
                                 1e9) public {
    classA = _classA;
  }

  /**
   * @dev Add a token address from which we can redeem VTH tokens
   * @param token The address of an ERC20 token
   * @param state redeemable if set to true, otherwise unredeemable
   */
  function setRedemptionToken(address token, bool state) onlyOwner public returns (bool) {
    redemptionTokens[token] = state;
    return true;
  }

  /**
   * @dev Redeem VTH tokens from an ERC20 token
   * @param token The address of an ERC20 token
   * @return uint256 representing the amount redeemed by the passed address.
   */
  function redeem(address token) public returns (uint256) {

    // token must be redeemable
    require(redemptionTokens[token]);

    // Can only be redeemed once
    require(!redeemed[token][msg.sender]);

    ERC20Token Token = ERC20Token(token);

    redeemed[token][msg.sender] = true;

    uint256 balance = Token.balanceOf(msg.sender);
    balances[msg.sender] = balances[msg.sender].add(balance);

    return balance;
  }
}
