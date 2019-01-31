import { LocalAddress, CryptoUtils } from 'loom-js'
import Web3 from 'web3'
import projectData from '../cleanedProjectData.json'
import milestoneData from '../cleanedMilestoneData.json'
import ratingData from '../cleanedRatingData.json'
import { shake128 } from 'js-sha3'
import Utils from './utils'
import delay from 'delay'
import axios from 'axios'
import _cliProgress from 'cli-progress'

const LoomTruffleProvider = require('loom-truffle-provider')
const path = require('path')
const { readFileSync } = require('fs')

require('dotenv').config({ path: path.join(__dirname, '/../.env') })

const LOOM_PRIVATE_KEY = readFileSync('./private_key', 'utf-8')
const MNEMONIC = readFileSync('./mnemonic.text', 'utf-8')
const NETWORK_ID = 'default'

let baseUrl = `${process.env.FEED_ENDPOINT}/${process.env.FEED_STAGE}`
const chainId = 'default'
const writeUrl = `http://${process.env.LOOM_END_POINT}:46658/rpc`
const readUrl = `http://${process.env.LOOM_END_POINT}:46658/query`
let loomTruffleProvider = new LoomTruffleProvider(chainId, writeUrl, readUrl, LOOM_PRIVATE_KEY)
loomTruffleProvider.createExtraAccountsFromMnemonic(MNEMONIC, 75)

axios.defaults.headers.post['Authorization'] = process.env.ACCESS_TOKEN

let RepSys
let Milestone

const apiFeed = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
})

class UploadProjectData {
  constructor () {
    this._setupLoom(LOOM_PRIVATE_KEY)
    this._createContractInstance()
  }

  _setupLoom = (privateKey) => {
    this.loomWeb3 = new Web3(loomTruffleProvider)
  }

  async disconnect () {
    await this.client.disconnect()
  }

  _createContractInstance () {
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

  generatePrivateKey () {
    let privateKey = CryptoUtils.generatePrivateKey()
    let publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey)
    let address = LocalAddress.fromPublicKey(publicKey).toString()
    return { privateKey, publicKey, address }
  }

  async upload () {
    try {
      const accounts = await this.loomWeb3.eth.getAccounts()
      const typeProjectFounder = '0x5707a2a6'
      const typeUser = '0x2db9fd3d'
      const richUserMeta = {
        username: 'richUser',
        photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
        telegramId: '-4444123132',
        phoneNumber: '+15198971683'
      }
      const richUserId = '0x' + shake128(String(richUserMeta.telegramId), 128)
      const bar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic)
      const rootUser = accounts[0]
      const richUser = accounts[3] // He has alot of tokens for every project
      await this.repSysInstance.methods.registerUser(richUserId, richUser, typeUser, 0, JSON.stringify(richUserMeta)).send({ from: rootUser })

      let projectPFMap = {}
      console.log('Register PFs and projects')
      bar.start(projectData.projects.length, 0)
      for (let i = 0; i < projectData.projects.length; i++) {
        const project = projectData.projects[i]
        const tempProjectFounderMeta = {
          username: `pf_${project.projectName}`,
          photoUrl: 'https://icobench.com/images/icos/icons/investx.jpg',
          telegramId: `-10023340203${i}`,
          phoneNumber: '+15198971683'
        }
        const projectFounderId = '0x' + shake128(String(tempProjectFounderMeta.telegramId), 128)
        await this.repSysInstance.methods.registerUser(projectFounderId, accounts[i + 10], typeProjectFounder, 0, JSON.stringify(tempProjectFounderMeta)).send({ from: rootUser })
        await delay(1000)

        const projectId = Web3.utils.sha3(project.projectName)
        await this.milestoneInstance.methods.registerProject(projectId, JSON.stringify(project)).send({ from: accounts[i + 10] })
        projectPFMap[projectId] = accounts[i + 10]
        bar.update(i + 1)
      }
      bar.stop()

      // Add Milestone data
      console.log('Add milestones to projects')
      let totalTaskLength = 0
      milestoneData.projectMilestones.forEach(project => {
        totalTaskLength += project.milestones.length
      })
      let progress = 0
      bar.start(totalTaskLength, 0)
      for (let i = 0; i < milestoneData.projectMilestones.length; i++) {
        const project = milestoneData.projectMilestones[i]
        const projectID = Web3.utils.sha3(project.projectName)
        for (let j = 0; j < project.milestones.length; j++) {
          const milestoneData = project.milestones[j]
          const milestoneContent = milestoneData.milestone
          const objectContent = milestoneData.objective
          let objData = Utils.encodeObjData([0], [1], [JSON.stringify(objectContent)])
          await this.milestoneInstance.methods.addMilestone(projectID, JSON.stringify(milestoneContent), objData.objMetaCompact, objData.objContent).send({ from: projectPFMap[projectID] })
          await this.milestoneInstance.methods.activateMilestone(projectID, j + 1, milestoneContent.expectedStartTime).send({ from: projectPFMap[projectID] })
          await this.milestoneInstance.methods.finalizeMilestone(projectID, j + 1, milestoneContent.expectedEndTime).send({ from: projectPFMap[projectID] })
          progress += 1
          bar.update(progress)
        }
      }
      bar.stop()

      // Rate First Milestone of each project
      console.log('Prepare to rate Milestones')
      const { projectRatings } = ratingData
      const privateKeyDictionary = {}
      console.log('Get KOL information, write, delegate votes, and rate:')
      bar.start(projectRatings.length, 0)
      for (let i = 0; i < projectRatings.length; i++) {
        const project = projectRatings[i]
        const projectID = Web3.utils.sha3(project.projectName)
        const totalTokens = 10000 * project.ratings.length

        // Clean previous delegations. Do not remove.
        // const arr = await this.repSysInstance.methods.getProxyList(projectID, richUser).call({from: richUser})
        // const pctArr = Array(arr.length).fill(0)
        // await this.repSysInstance.methods.delegate(projectID, arr, pctArr).send({ from: richUser })

        await this.repSysInstance.methods.writeVotes(projectID, richUser, totalTokens).send({ from: rootUser })
        let kolAddressList = []
        let kolRatingList = []
        let kolCommentList = []
        let kolPrivateKeyList = []
        let milestoneIdList = []
        let milestoneRatingCount = {}
        for (let j = 0; j < project.ratings.length; j++) {
          const ratingRecord = project.ratings[j]
          if (privateKeyDictionary[ratingRecord.actor] === undefined) {
            const rv = await apiFeed.post(
              '/get-actor-private-key',
              {
                actor: ratingRecord.actor
              }
            )
            if (rv.data.ok) {
              const privateKey = new Uint8Array(Web3.utils.hexToBytes(rv.data.privateKey))
              let publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey)
              const address = LocalAddress.fromPublicKey(publicKey).toString()
              const keyPair = {
                privateKey: rv.data.privateKey,
                address: address
              }
              privateKeyDictionary[ratingRecord.actor] = keyPair
            } else {
              console.log(rv.data.message)
            }
          }
          milestoneIdList.push(ratingRecord.milestoneId)
          kolAddressList.push(privateKeyDictionary[ratingRecord.actor].address)
          kolPrivateKeyList.push(privateKeyDictionary[ratingRecord.actor].privateKey)
          kolRatingList.push(ratingRecord.rating)
          kolCommentList.push(ratingRecord.comment)
          milestoneRatingCount[ratingRecord.milestoneId] = typeof milestoneRatingCount[ratingRecord.milestoneId] !== 'number' ? 1 : milestoneRatingCount[ratingRecord.milestoneId] + 1
        }
        let finalizedMilestones = {}
        if (kolAddressList.length !== 0) {
          const pcts = Array(project.ratings.length).fill(Math.floor((10000 / totalTokens) * 100))
          await this.repSysInstance.methods.delegate(projectID, kolAddressList, pcts).send({ from: richUser })
          for (let x = 0; x < milestoneIdList.length; x++) {
            if (finalizedMilestones[milestoneIdList[x]] !== true) {
              await this.milestoneInstance.methods.finalizeValidators(projectID, milestoneIdList[x], kolAddressList.length).send({ from: rootUser })
              finalizedMilestones[milestoneIdList[x]] = true
            }
          }
          // rate Ms
          for (let x = 0; x < kolAddressList.length; x++) {
            const base64PrivateKey = CryptoUtils.Uint8ArrayToB64(new Uint8Array(Web3.utils.hexToBytes(kolPrivateKeyList[x])))

            const tempWeb3 = new Web3(new LoomTruffleProvider(chainId, writeUrl, readUrl, base64PrivateKey))
            const tempMilestoneInstance = new tempWeb3.eth.Contract(Milestone.abi, Milestone.networks[NETWORK_ID].address)
            // some comments has no rating score.
            if (kolRatingList[x]) {
              try {
                await tempMilestoneInstance.methods.rateObj(projectID, milestoneIdList[x], [1, kolRatingList[x]], JSON.stringify(kolCommentList[x])).send({ from: kolAddressList[x] })
              } catch (e) {
                // Print the error and input
                console.log(project.projectName, projectID, milestoneIdList[x], kolRatingList[x], JSON.stringify(kolCommentList[x]))
                console.log(e)
                continue
              }
            }
          }
        }
        bar.update(i + 1)
      }
      bar.stop()
    } catch (err) {
      console.log(err)
    }
  }
}

async function main () {
  if (process.env.CONTRACT_ARTIFACTS_URL) {
    // use contract artifacts from remote url instead of local files
    console.log(`Loading contract artifacts from ${process.env.CONTRACT_ARTIFACTS_URL} ...`)
    let responseRepSys = await axios.get(process.env.CONTRACT_ARTIFACTS_URL + '/RepSys.json')
    RepSys = responseRepSys.data
    let responseMilestone = await axios.get(process.env.CONTRACT_ARTIFACTS_URL + '/Milestone.json')
    Milestone = responseMilestone.data
    console.log('Remote contract artifacts loaded!')
  } else {
    console.log('Loading contract artifacts from local ...')
    RepSys = require('../build/contracts/RepSys.json')
    Milestone = require('../build/contracts/Milestone.json')
    console.log('Local contract artifacts loaded!')
  }

  let t = new UploadProjectData()

  await t.upload()
}

main()
