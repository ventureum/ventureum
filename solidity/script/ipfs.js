'use strict'

const rootDir = '../'
import axios from 'axios'
import bs58 from 'bs58'

const ipfsAPI = require(rootDir + 'node_modules/ipfs-api')

export async function ipfsAdd (content) {
  const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
  let IPFSHash

  try {
    IPFSHash = await ipfs.files.add({
      content: Buffer.from(content)
    })
  } catch (e) {
    console.log("content: [" + content + "], err message:" + e)
    return "infura ipfs error"
  }
  const hash = IPFSHash[0].hash
  const bytes32 = getBytes32FromMultiHash(hash).digest
  return bytes32
}

export async function toHash (objs) {
  let hashTable = []
  for (let i = 0; i < objs.length; i++) {
    let hashs = []
    for (let j = 0; j < objs[i].length; j++) {
      const hash = await ipfsAdd(objs[i][j])
      hashs.push(hash)
    }
    hashTable.push(hashs)
  }

  return hashTable
}

function getBytes32FromMultiHash (multihash) {
  const decoded = bs58.decode(multihash)

  return {
    digest: `0x${decoded.slice(2).toString('hex')}`,
    hashFunction: decoded[0],
    size: decoded[1]
  }
}

