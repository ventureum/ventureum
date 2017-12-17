pragma solidity ^0.4.18;

contract States {
  // states
  uint8 constant INACTIVE = 0;
  uint8 constant IP = 1;
  uint8 constant VP1 = 2;
  uint8 constant VP2 = 3;
  uint8 constant VP1_AFTER_VP2 = 4;
  uint8 constant C = 5;
  uint8 constant RP = 6;
  uint8 constant TERMINAL = 7;
  uint8 constant UNDETERMINED = 8; 
}
