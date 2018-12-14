import axios from 'axios'
import Web3 from 'web3'
import trackedTokens from '../trackedTokens'
import RepSysExp from './RepSysExp.json'
import RepSysBeta from './RepSysBeta.json'
import MilestoneExp from './MilestoneExp.json'
import MilestoneBeta from './MilestoneBeta.json'
import { shake128, keccak256 } from 'js-sha3'

const {
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  LocalAddress,
  CryptoUtils,
  LoomProvider,
  createJSONRPCClient
} = require('loom-js')

const {
  API_STAGE,
  LOOM_END_POINT,
  LOOM_PRIVATE_KEY,
  ACCESS_TOKEN
} = process.env

const FEEDSYS_END_POINT = `https://7g1vjuevub.execute-api.ca-central-1.amazonaws.com/${API_STAGE}`
const TCR_END_POINT = `https://mfmybdhoea.execute-api.ca-central-1.amazonaws.com/${API_STAGE}`

const userTypeMapping = {
  KOL: '0xf4af7c06',
  PF: '0x5707a2a6',
  USER: '0x2db9fd3d'
}

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

const projectFounders = []

const mockProjectContent = {
  projectName: 'Blockcloud',
  logo: 'https://icobench.com/images/icos/icons/datablockchain.jpg',
  wideLogo: 'https://icodrops.com/wp-content/uploads/2018/06/Haja-banner.jpg',
  shortDescription: 'A Blockchain-based Advanced TCP/IP Architecture Providing Constant Connectivity for Dynamic Networks',
  video: 'https://www.youtube.com/watch?v=64kQLRZeE_E',
  description: 'While BigData has traditionally been available only to big companies, Blockcloud.io lowers the barrier for entry and expands our potential client base to include small, medium and large businesses around the globe as well as ICOs seeking data for their new ventures.',
  corporationInfo: {
    location: {
      country: 'CA',
      city: 'Toronto'
    },
    team: {
      teamSize: 6,
      members: [
        {
          name: 'Raul Romero',
          title: 'CEO',
          link: 'https://www.google.com'
        }, {
          name: 'Zi Wen Zhang',
          title: 'CTO',
          link: 'https://www.google.com'
        }, {
          name: 'Lawrence Duerson',
          title: 'COO',
          link: 'https://www.google.com'
        }, {
          name: 'Raul Romero',
          title: 'CEO',
          link: 'https://www.google.com'
        }, {
          name: 'Zi Wen Zhang',
          title: 'CTO',
          link: 'https://www.google.com'
        }, {
          name: 'Lawrence Duerson',
          title: 'COO',
          link: 'https://www.google.com'
        }
      ]
    }
  },
  category: 'Artificial Intelligence',
  website: 'https://www.google.com',
  whitepaper: 'https://www.google.com',
  token: {
    symbol: 'BLOC',
    price: '10',
    platform: 'Ethereum',
    accept: ['ETH', 'BTC'],
    KYC: true,
    cantParticipate: ['CN', 'US']
  },
  socialLinks: [
    {
      type: 'telegram',
      link: 'https://www.google.com'
    }, {
      type: 'github',
      link: 'https://www.google.com'
    }, {
      type: 'reddit',
      link: 'https://www.google.com'
    }, {
      type: 'twitter',
      link: 'https://www.google.com'
    }, {
      type: 'facebook',
      link: 'https://www.google.com'
    }, {
      type: 'slack',
      link: 'https://www.google.com'
    }
  ]
}

const MOCK_USER_NUMBER = 20
const NETWORK_ID = 'default'

const feedSysAPI = axios.create({
  baseURL: FEEDSYS_END_POINT,
  headers: {
    'Authorization': ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
})
const tcrAPI = axios.create({
  baseURL: TCR_END_POINT,
  headers: {
    'Authorization': ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
})

function getClient (privateKey, publicKey) {
  const writer = createJSONRPCClient({ protocols: [{ url: `http://${LOOM_END_POINT}:46658/rpc` }] })
  const reader = createJSONRPCClient({ protocols: [{ url: `http://${LOOM_END_POINT}:46658/query` }] })
  const client = new Client(
    NETWORK_ID,
    writer,
    reader
  )

  client.txMiddleware = [
    new NonceTxMiddleware(publicKey, client),
    new SignedTxMiddleware(privateKey)
  ]

  return client
}

class AddMockData {
  constructor () {
    this._loadTrackedTokens()
    this._setupLoom(LOOM_PRIVATE_KEY)
    this._createContractInstance()
  }

  _setupLoom = (privateKey) => {
    privateKey = CryptoUtils.B64ToUint8Array(privateKey)
    let publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey)
    this.from = LocalAddress.fromPublicKey(publicKey).toString()
    this.client = getClient(privateKey, publicKey)
    let loomProvider = new LoomProvider(this.client, privateKey)

    // add project founder's privateKey
    this.projectFounders = []
    for (let i = 0; i < trackedTokens.length; i++) {
      const fprivateKey = CryptoUtils.generatePrivateKey()
      let fPublicKey = CryptoUtils.publicKeyFromPrivateKey(fprivateKey)
      let address = LocalAddress.fromPublicKey(fPublicKey).toString()
      const keyPair = {
        privateKey: fprivateKey,
        address: address
      }
      this.projectFounders.push(keyPair)
    }
    const pfPrivateKeyArray = this.projectFounders.map(keyPair => {
      return keyPair.privateKey
    })

    loomProvider.addAccounts(pfPrivateKeyArray)
    this.loomWeb3 = new Web3(loomProvider)
    this.user = this.from
    this.client.on('error', msg => {
      console.error('Error on connect to client', msg)
      console.warn('Please verify if loom command is running')
      this.disconnect()
      throw msg
    })
  }

  async disconnect () {
    await this.client.disconnect()
  }

  _loadTrackedTokens = () => {
    this.trackedTokens = trackedTokens
  }

  _createContractInstance () {
    let RepSys = RepSysExp
    let Milestone = MilestoneExp
    if (API_STAGE === 'beta') {
      console.log(`Using ${API_STAGE} loom contract`)
      RepSys = RepSysBeta
      Milestone = MilestoneBeta
    }
    this.RepSysCurrentNetwork = RepSys.networks[NETWORK_ID]
    this.MilestoneCurrentNetwork = Milestone.networks[NETWORK_ID]

    if (!this.RepSysCurrentNetwork || !this.MilestoneCurrentNetwork) {
      throw Error('Contract not deployed on Loom')
    }

    const RepSysABI = RepSys.abi
    const MilestoneABI = Milestone.abi

    this.repSysInstance = new this.loomWeb3.eth.Contract(RepSysABI, this.RepSysCurrentNetwork.address)
    this.milestoneInstance = new this.loomWeb3.eth.Contract(MilestoneABI, this.MilestoneCurrentNetwork.address)
  }

  registerUsers = async () => {
    for (let i = 1; i <= MOCK_USER_NUMBER; i++) {
      const uuid = '0x' + shake128(String(i), 128)
      const REPUTATION = 10000000
      const meta = {
        username: `mockUser_${i}`,
        photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
        telegramId: `-1002334${i}203`,
        phoneNumber: `+1519897168${i}`
      }
      try {
        await this.repSysInstance.methods.registerUser(
          uuid,
          addressList[i],
          userTypeMapping.USER,
          REPUTATION,
          JSON.stringify(meta)
        ).send({from: this.user})
        console.log(`Added user: ${meta.username} with ID: ${uuid}`)
      } catch (e) {
        throw e
      }
    }

    // Register project founder
    for (let i = 0; i < this.projectFounders.length; i++) {
      const telegramId = `-100${i}3342203`
      const fUUID = '0x' + shake128(telegramId, 128)
      const hashBytes = Buffer.from(shake128(telegramId, 128), 'hex')
      const uuidParse = require('uuid-parse')
      const actor = uuidParse.unparse(hashBytes)

      const REPUTATION = 10000000
      const meta = {
        username: `mockPF_${i}`,
        photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
        telegramId: telegramId,
        phoneNumber: `+1519897168${i}`
      }
      try {
        await this.repSysInstance.methods.registerUser(
          fUUID,
          this.projectFounders[i].address,
          userTypeMapping.PF,
          REPUTATION,
          JSON.stringify(meta)
        ).send({from: this.user})
        const hexPrivateKey = Web3.utils.bytesToHex(this.projectFounders[i].privateKey)
        const request = {
          actor: actor,
          privateKey: hexPrivateKey
        }
        console.log(`Added PF: ${meta.username} with ID: ${fUUID}`)
        const response = await feedSysAPI.post(
          '/set-actor-private-key',
          request
        )
        if (!response.data.ok) {
          console.log(response.data)
          throw new Error(`Set PF ${fUUID} private key failed`)
        }
        console.log(`Set PF ${fUUID} private key: ${hexPrivateKey}`)
      } catch (e) {
        console.log(e)
      }
    }
  }

  addTrackedWallets = async () => {
    let actors = []
    for (let i = 0; i <= MOCK_USER_NUMBER; i++) {
      const shakeHash = shake128(String(i), 128)
      const hashBytes = Buffer.from(shakeHash, 'hex')
      const uuidParse = require('uuid-parse')
      const actor = uuidParse.unparse(hashBytes)
      actors.push(actor)
      const request = {
        'actor': actors[i],
        'walletAddressList': [addressList[i]]
      }
      await feedSysAPI.post(
        `/add-tracked-wallet-addresses`,
        request
      )
      console.log(`Added wallet address ${addressList[i]} to actor ${actors[i]}`)
    }
  }

  addMockProjects = async () => {
    for (let i = 0; i < this.trackedTokens.length; i++) {
      const projectId = '0x' + keccak256(this.trackedTokens[i].name)
      try {
        await this.milestoneInstance.methods.registerProject(
          projectId,
          JSON.stringify(mockProjectContent)
        ).send({ from: this.projectFounders[i].address })
        console.log(`Project added: ${this.trackedTokens[i].name}, admin: ${this.projectFounders[i].address}`)
      } catch (e) {
        console.log(e)
      }
    }
  }
}

async function main () {
  let t = new AddMockData()

  await t.registerUsers()
  await t.addTrackedWallets()
  await t.addMockProjects()
}

main()
