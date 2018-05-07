pragma solidity ^0.4.23;

import './DualClassRedeemableERC20Token.sol';

contract VTHTokenClassA is DualClassRedeemableERC20Token {

  /**
   * construct VTH Class A token
   * Totaly Supply: 70% of VTH supply = 7e8 VTH, or 7e26 mVGTH (1 mVTH = 1e-18 VTH)
   */
  function VTHTokenClassA() DualClassRedeemableERC20Token('Ventureum Token Class A',
                                                                          'VTH',
                                                                          18,
                                                                          7e26,
                                                                          true) public {

  }
}
