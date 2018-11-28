const { TextEncoder, TextDecoder } = require('util')
const Web3 = require('web3')

module.exports = {
  toHexArray: function (byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
      return '0x' + ('0' + (byte & 0xFF).toString(16)).slice(-2)
    })
  },

  /*
   * Encode obj data to solidity function param compatible format
   *
   * Usage:
   * commands = [0, 1, 2] // add first obj, modify second obj, delete third obj
   * ids = [ 1, 2, 3 ] // operate on #1, #2 ,#3 obj
   * contents = ['abc', 'def', '']
   *   set 'abc' as first obj's content
   *   set 'def' as second obj's content
   *   no need to set third obj's content since we are deleting it
   *
   * Output:

   *  objMetaCompact: [ 30010, 30021, 30032 ] // encoded from input
   *  IMPORTANT !!
   *  Compact format:
   *  from the least significant digit to the most significant digit,
   *    - [0] (first digit) : command, range from 0..2
   *         0: add, 1: modify, 2:delete
   *    - [1..3] (second digit to the fourth digit) : objId
   *         starting from 1
   *    - [4..] (starting from the fifth digit) : objContentLen
   *         # of bytes of obj content
   *
   *  objContent: {[ '0x68','0x65', ...] } // just some random hex
   *    Note that objContent is a continuous byte array which encodes obj content
   *    data for all objs in our input, we use objContentLen to separate this array
   *    into different parts
   *
   */
  encodeObjData: function (commands, ids, contents) {
    let objMetaCompact = []
    let objContent = []
    for (let i = 0; i < commands.length; i++) {
      let _command = commands[i]
      let _id = ids[i]
      let _content = contents[i]
      const encoder = new TextEncoder()
      const uint8array = encoder.encode(_content)
      let _contentLen = uint8array.length
      let _objMetaCompact = _command + _id * 10 + _contentLen * 10000
      let _objContent = this.toHexArray(uint8array)
      objMetaCompact.push(_objMetaCompact)
      objContent = objContent.concat(_objContent)
    }
    return { objMetaCompact: objMetaCompact, objContent: objContent }
  },
  decodeObjContent: function (encodedContent) {
    const decoder = new TextDecoder()
    return decoder.decode(new Uint8Array(Web3.utils.hexToBytes(encodedContent)))
  }
}
