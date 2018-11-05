import axios from 'axios'
import trackedTokens from '../trackedTokens'
import { keccak256 } from 'js-sha3'

const TCR_END_POINT = 'https://mfmybdhoea.execute-api.ca-central-1.amazonaws.com/exp'
const admin = '0xa9B0cF09F88B95cE9596524bD15147f8664B85bF'
const content = JSON.stringify({
  M1: 'm1',
  M2: 'm2',
  M3: 'm3'
})

async function addMockProjects () {
  for (let token of trackedTokens) {
    const timestamp = Math.round(new Date() / 1000)
    const projectId = '0x' + keccak256(token.name)
    const request = {
      'projectId': projectId,
      'admin': admin,
      'content': content,
      'blockTimestamp': timestamp
    }
    const result = await axios.post(
      `${TCR_END_POINT}/project`,
      request
    )
    console.log('added:', request)
    console.log('result:', result.data)
  }
}

async function getMockProjects () {
  const request = {
    'limit': 10,
    'cursor': ''
  }
  const result = await axios.post(
    `${TCR_END_POINT}/get-project-list`,
    request
  )
  console.log('list:', result.data)
}

addMockProjects()
// getMockProjects()
