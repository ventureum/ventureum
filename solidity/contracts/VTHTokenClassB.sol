pragma solidity ^0.4.18;

import './DualClassRedeemableERC20Token.sol';

contract VTHTokenClassB is DualClassRedeemableERC20Token {

  /**
   * construct VTH Class B token
   * Total Supply: 30% of VTH supply.
   * Init Supply: 15% of VTH supply = 1.5e8 VTH, or 1.5e26 mVTH (1 mVTH = 1e-18 VTH)
   * Another 15% of VTH will be redeemed from VGTH
   * 1.5e7 VTH will be redeemed from VGTH
   */
  function VTHTokenClassB() DualClassRedeemableERC20Token('Ventureum Token Class B',
                                                                          'VTH',
                                                                          18,
                                                                          1.5e26,
                                                                          false) public {

  }
}
