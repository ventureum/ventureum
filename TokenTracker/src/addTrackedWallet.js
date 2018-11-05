import axios from 'axios'
import { shake128 } from 'js-sha3'

const END_POINT = 'https://7g1vjuevub.execute-api.ca-central-1.amazonaws.com/exp'
const addressList = [
  '0x85b0e250d62873f283f6f5a11f2bdc91281b96cf',
  '0xaef370c313843ca6136f3e1830308188a376fd42',
  '0xa30d151ab62f032908dca6b5e7ee21b0c47e3cb6',
  '0xfe9e8709d3215310075d67e3ed32a380ccf451c8',
  '0xfbb1b73c4f0bda4f67dca266ce6ef42f520fbb98',
  '0x7c31560552170ce96c4a7b018e93cddc19dc61b6',
  '0xf39d30fa570db7940e5b3a3e42694665a1449e4b',
  '0xc3590c15cd253e93a70430f4c1e254ae9303748e',
  '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
  '0xe0f6ef3d61255d1bd7ad66987d2fbb3fe5ee8ea4',
  '0x9d3937226a367bedce0916f9cee4490d22214c7c',
  '0x2e32b274abcd0f880c5ad87377dc5004b42578c0',
  '0x4ba8226e3a1edbeba23d9b637a3231d4002b1d45',
  '0xc8640c740210d0178d369001e19ae9d7c1d8a70f',
  '0xff8e2295ef4ad0db7afadc13743c227bb0e82838',
  '0x742d35cc6634c0532925a3b844bc454e4438f44e',
  '0xadb2b42f6bd96f5c65920b9ac88619dce4166f94',
  '0x00791803ce12bca730f8e3f29f0c6aee29f0c19d',
  '0x008e5b4b1948401bfef6b921beeabb2ff772d1fb',
  '0xcb25966330044310ecd09634ea6b1f4190d5b10d',
  '0x8e279e54b04327adf57117c19bc3950d7109407c'
]
let actors = []
async function registerUser () {
  // register user
  for (let i = 1; i < 21; i++) {
    // generate actor ID
    const shakeHash = shake128(String(i), 128)
    const hashBytes = Buffer.from(shakeHash, 'hex')
    const uuidParse = require('uuid-parse')
    const actor = uuidParse.unparse(hashBytes)
    actors.push(actor)

    const username = `testUser${i}`
    const userType = 'USER'
    const request = {
      actor: actor,
      username: username,
      userType: userType
    }
    await axios.post(
      `${END_POINT}/profile`,
      request
    )
    console.log(`Added user: ${username} with ID: ${actor}`)
  }

  for (let i = 0; i < 20; i++) {
    const request = {
      'actor': actors[i],
      'walletAddressList': [addressList[i]]
    }
    await axios.post(
      `${END_POINT}/add-tracked-wallet-addresses`,
      request
    )
    console.log(`Added wallet address ${addressList[i]} to actor ${actors[i]}`)
  }
}

registerUser()
