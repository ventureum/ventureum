pragma solidity ^0.4.17;

import './RedeemableERC20Token.sol';

contract VGTHToken is RedeemableERC20Token {

  /**
   * construct VGTH token
   * Total Supply: 15% of VTH supply = 1.5e7 VGTH, or 1.5e25 mVGTH (1 mVGTH = 1e-18 VGTH)
   * 1.5e7 VGTH tokens are automatically issued to the contract creator
   */
  function VGTHToken() RedeemableERC20Token('Ventureum Genesis Token',
                                            'VGTH',
                                            18,
                                            1.5e25) public {
  }
}
