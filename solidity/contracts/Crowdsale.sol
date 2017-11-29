pragma solidity ^0.4.11;

import './VTHTokenClassA.sol';
import './SafeMath.sol';

contract Crowdsale {
  using SafeMath for uint256;

  // The token being sold

  VTHTokenClassA public token;

  // start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;

  // address where funds are collected
  address public wallet;

  // how many token units a buyer gets per wei
  // pre-sale: 1e4 mVTH / wei or 0.0001 ETH / VTH (1 VTH = 1e18 mVTH)
  uint256 public rate;

  // amount of raised money in wei
  uint256 public weiRaised;

  uint256 public cap;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  function Crowdsale(address _token, uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet, uint256 _cap) public {
    require(_startTime >= now);
    require(_endTime >= _startTime);
    require(_rate > 0);
    require(_wallet != address(0));
    require(_cap > 0);

    token = VTHTokenClassA(_token);
    startTime = _startTime;
    endTime = _endTime;
    rate = _rate;
    wallet = _wallet;
    cap = _cap;
  }


  // fallback function can be used to buy tokens
  function () public payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) public payable {
    require(beneficiary != address(0));
    require(validPurchase());

    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(rate);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    if(!token.transfer(beneficiary, tokens)) {
      // cannot allocate tokens to the beneficiary, revert changes
      revert();
    }

    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
  }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    wallet.transfer(msg.value);
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal constant returns (bool) {
    bool withinPeriod = now >= startTime && now <= endTime;
    bool nonZeroPurchase = msg.value != 0;
    bool withinCap = weiRaised.add(msg.value) <= cap;
    return withinPeriod && nonZeroPurchase && withinCap;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    // make sure cap is not reached
    bool capReached = weiRaised >= cap;
    return now > endTime || capReached;
  }
}
