pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "./Handler.sol";
import "./IACLHandler.sol";


contract ACLHandler is IACLHandler, Handler, Ownable {

    event LogPermit(bytes32 indexed src, bytes32 indexed dst, bytes32 indexed sig);
    event LogForbid(bytes32 indexed src, bytes32 indexed dst, bytes32 indexed sig);

    // Access control list acl[CI][CI][SIG]
    mapping (bytes32 => mapping (bytes32 => mapping (bytes32 => bool))) acl;

    bytes32 constant public ANY = bytes32(uint(-1));

    constructor (address kernelAddr) Handler(kernelAddr) public {
      CI = keccak256("ACLHandler");
    }

    /*
      Check if an action is authorized

      @param srcCI source CI
      @param dstCI destination CI
      @param sig function signature

      @returns bool true if authorized, otherwise false
    */
    function isAuthorized(bytes32 srcCI, bytes32 dstCI, bytes4 sig)
        public
        view
        returns (bool) {

        return acl[srcCI][dstCI][sig] ||
            acl[srcCI][dstCI][ANY] ||
            acl[srcCI][ANY][sig] ||
            acl[srcCI][ANY][ANY] ||
            acl[ANY][dstCI][sig] ||
            acl[ANY][dstCI][ANY] ||
            acl[ANY][ANY][sig] ||
            acl[ANY][ANY][ANY];
    }

    /*
      Permit an action

      @param srcCI source CI
      @param dstCI destination CI
      @param sig function signature
    */
    function permit(bytes32 srcCI, bytes32 dstCI, bytes32 sig) public onlyOwner {
        require(srcCI != 0x0 && dstCI != 0x0);

        acl[srcCI][dstCI][sig] = true;
        emit LogPermit(srcCI, dstCI, sig);
    }

    /*
      Forbid an action

      @param srcCI source CI
      @param dstCI destination CI
      @param sig function signature
    */
    function forbid(bytes32 srcCI, bytes32 dstCI, bytes32 sig) public onlyOwner {
        require(srcCI != 0x0 && dstCI != 0x0);

        acl[srcCI][dstCI][sig] = false;
        emit LogForbid(srcCI, dstCI, sig);
    }
}
