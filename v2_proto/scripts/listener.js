import {
  Client, LocalAddress, CryptoUtils, LoomProvider
} from 'loom-js'

import Web3 from 'web3'
import RepSys from '../build/contracts/RepSys.json'
import Milestone from '../build/contracts/Milestone.json'
import Queue from 'bull'
import axios from 'axios'
import moment from 'moment'
const sha3 = require('js-sha3').sha3_256
const uuidParse = require('uuid-parse')
const Utils = require('../scripts/utils')

require('events').EventEmitter.prototype._maxListeners = 100

// default endpoints for testing
var tcrEndpoint = 'https://mfmybdhoea.execute-api.ca-central-1.amazonaws.com/exp'
var feedEndpoint = 'https://7g1vjuevub.execute-api.ca-central-1.amazonaws.com/exp'

if (process.env.TCR_ENDPOINT) {
  tcrEndpoint = process.env.TCR_ENDPOINT
}

if (process.env.FEED_ENDPOINT) {
  feedEndpoint = process.env.FEED_ENDPOINT
}

// fill in access token here
axios.defaults.headers.post['Authorization'] = process.env.ACCESS_TOKEN
axios.defaults.headers.post['Content-Type'] = 'application/json'

const userTypeMapping = {
  '0xf4af7c06': 'KOL',
  '0x5707a2a6': 'PF',
  '0x2db9fd3d': 'USER'
}

class Contract {
  async loadContract () {
    this._createClient()
    this._createCurrentUserAddress()
    this._createWebInstance()
    await this._createContractInstance()
  }

  _createClient () {
    this.privateKey = CryptoUtils.generatePrivateKey()
    this.publicKey = CryptoUtils.publicKeyFromPrivateKey(this.privateKey)
    this.client = new Client(
      'default',
      'ws://127.0.0.1:46658/websocket',
      'ws://127.0.0.1:46658/queryws'
    )

    this.client.on('error', msg => {
      console.error('Error on connect to client', msg)
      console.warn('Please verify if loom command is running')
    })
  }

  _createCurrentUserAddress () {
    this.currentUserAddress = LocalAddress.fromPublicKey(this.publicKey).toString()
  }

  _createWebInstance () {
    this.web3 = new Web3(new LoomProvider(this.client, this.privateKey))
  }

  async _createContractInstance () {
    const networkId = await this._getCurrentNetwork()
    this.RepSysCurrentNetwork = RepSys.networks[networkId]
    this.MilestoneCurrentNetwork = Milestone.networks[networkId]

    if (!this.RepSysCurrentNetwork || !this.MilestoneCurrentNetwork) {
      throw Error('Contract not deployed on Loom')
    }

    const RepSysABI = RepSys.abi
    const MilestoneABI = Milestone.abi
    this.repSysInstance = new this.web3.eth.Contract(RepSysABI, this.RepSysCurrentNetwork.address, {
      from: this.currentUserAddress
    })
    this.milestoneInstance = new this.web3.eth.Contract(MilestoneABI, this.MilestoneCurrentNetwork.address, {
      from: this.currentUserAddress
    })

    this.repSysInstance.events.allEvents().on('data', this.onEvent)
    this.milestoneInstance.events.allEvents().on('data', this.onEvent)
  }

  async addEventListener (fn) {
    this.onEvent = fn
  }

  async _getCurrentNetwork () {
    return Promise.resolve('default')
  }
}

class EventHandler {
  constructor () {
    // create a message queue
    this.q = new Queue('event')
  }

  start () {
    // Local events pass the job instance...
    this.q.on('progress', function (job, progress) {
      console.log(`Job ${job.id} (${job.name}) is ${progress * 100}% ready!`)
    })

    this.q.on('completed', function (job, result) {
      console.log(`Job ${job.id} (${job.name}) completed! Result: ${result}`)
    })

    this.q.on('failed', function (job, err) {
      console.log(`Job ${job.id} (${job.name}) failed! Error: ${err}`)
    })

    // RepSys events
    this.q.process('RegisterUser', this.registerUserEvent)
    this.q.process('WriteVotes', this.writeVotesEvent)
    this.q.process('Delegate', this.delegateEvent)

    // Milestone events
    this.q.process('RegisterProject', this.registerProjectEvent)
    this.q.process('UnregisterProject', this.unRegisterProjectEvent)
    this.q.process('AddMilestone', this.addMilestoneEvent)
    this.q.process('RemoveMilestone', this.removeMilestoneEvent)
    this.q.process('ActivateMilestone', this.activateMilestoneEvent)
    this.q.process('FinalizeMilestone', this.finalizeMilestoneEvent)
    this.q.process('AddObj', this.addObjEvent)
    this.q.process('RemoveObj', this.removeObjEvent)
    this.q.process('RateObj', this.rateObjEvent)
    this.q.process('FinalizeValidators', this.finalizeValidatorsEvent)
    this.q.process('UnregisterUser', this.unregisterUserEvent)
  }

  responseErrorCheck = (responseData) => {
    if (!responseData.ok) {
      throw new Error(JSON.stringify(responseData))
    }
  }

  getId = async (publicKey) => {
    let response = await axios.post(feedEndpoint + '/get-actor-uuid-from-public-key', {
      publicKey: publicKey
    })

    this.responseErrorCheck(response.data)
    return response.data.actor
  }

  toStandardUUID = (id) => {
    // convert bytes16 id to standard 128-bit UUID
    const hashBytes = Buffer.from(id.substring(2), 'hex')
    const uuid = uuidParse.unparse(hashBytes)
    return uuid
  }

  handleObjChanges = async (projectId, milestoneId, objMetaCompact, objContent) => {
    // first decode obj data
    let data = Utils.decodeObjData(objMetaCompact, objContent)

    let requestListAdd = []
    let requestListDelete = []

    for (let i = 0; i < data.commands.length; i++) {
      let _command = data.commands[i]
      let _id = data.ids[i]
      let _content = data.contents[i]

      if (_command === 0 || _command === 1) {
        // add or modifiy
        requestListAdd.push({
          projectId: projectId,
          milestoneId: Number(milestoneId),
          objectiveId: _id,
          content: _content,
          blockTimestamp: moment().unix()
        })
      } else if (_command === 2) {
        // delete
        requestListDelete.push({
          projectId: projectId,
          milestoneId: Number(milestoneId),
          objectiveId: _id,
          blockTimestamp: moment().unix()
        })
      } else {
        throw new Error('Invalid command')
      }
    }

    let responseAdd = null
    let responseDelete = null

    if (requestListAdd.length > 0) {
      responseAdd = await axios.post(tcrEndpoint + '/batch-objectives', {
        requestList: requestListAdd
      })
      this.responseErrorCheck(responseAdd.data)
    }

    if (requestListDelete.length > 0) {
      responseDelete = await axios.post(tcrEndpoint + '/delete-batch-objectives', {
        requestList: requestListDelete
      })
      this.responseErrorCheck(responseDelete.data)
    }

    return {
      responseAdd: responseAdd ? responseAdd.data : null,
      responseDelete: responseDelete ? responseDelete.data : null
    }
  }

  // individual event handlers
  // RepSys event handlers
  registerUserEvent = async (job) => {
    let { uuid, publicKey, userType, reputation, meta } = job.data
    meta = JSON.parse(meta)

    let request = {
      actor: this.toStandardUUID(uuid),
      userType: userTypeMapping[userType],
      photoUrl: meta.photoUrl,
      telegramId: meta.telegramId,
      phoneNumber: meta.phoneNumber,
      username: meta.username,
      publicKey: publicKey
    }

    let response = await axios.post(feedEndpoint + '/profile', request)
    this.responseErrorCheck(response.data)

    let refuelRequest = {
      actor: this.toStandardUUID(uuid),
      reputation: Number(reputation),
      fuel: 10000,
      milestonePoints: 10000
    }

    let refuelResponse = await axios.post(feedEndpoint + '/dev-refuel', refuelRequest)
    this.responseErrorCheck(refuelResponse.data)

    // next, add user to proxy list if userType is kol
    let requestAddProxy = null
    let responseAddProxy = null
    if (userTypeMapping[userType] === 'KOL') {
      requestAddProxy = {
        proxy: this.toStandardUUID(uuid)
      }
      responseAddProxy = await axios.post(tcrEndpoint + '/add-proxy', requestAddProxy)
      this.responseErrorCheck(responseAddProxy.data)
    }

    return JSON.stringify({ register: response.data, addProxy: responseAddProxy ? responseAddProxy.data : null })
  }

  writeVotesEvent = async (job) => {
    let { projectId, user, val, proxies, votesDiff } = job.data

    let uuid = await this.getId(user)

    let request = {
      actor: uuid,
      projectId: projectId,
      availableDelegateVotes: Number(val)
    }

    let response = await axios.post(tcrEndpoint + '/update-available-delegate-votes', request)
    this.responseErrorCheck(response.data)

    let proxyUuid = await Promise.all(proxies.map((p) => this.getId(p)))

    // now update availableReceivedVotes for proxies
    let updateDelegationRequest = []

    for (let i = 0; i < proxies.length; i++) {
      updateDelegationRequest.push({
        actor: proxyUuid[i],
        projectId: projectId,
        receivedDelegateVotesDelta: Number(votesDiff[i])
      })
    }

    let updateDelegationResponse = await axios.post(tcrEndpoint + '/update-batch-received-delegate-votes', {
      requestList: updateDelegationRequest
    })
    this.responseErrorCheck(updateDelegationResponse.data)

    return JSON.stringify({ writeVotes: response.data, updateDelegation: updateDelegationResponse.data })
  }

  delegateEvent = async (job) => {
    let { projectId, principal, proxies, votesInPercent, votesDiff } = job.data

    let principalUuid = await this.getId(principal)
    let proxyUuid = await Promise.all(proxies.map((p) => this.getId(p)))
    let proxyVotingList = []
    for (let i = 0; i < proxies.length; i++) {
      proxyVotingList.push({
        proxy: proxyUuid[i],
        blockTimestamp: moment().unix(),
        votesInPercent: Number(votesInPercent[i])
      })
    }
    let request = {
      actor: principalUuid,
      projectId: projectId,
      proxyVotingList: proxyVotingList
    }

    let response = await axios.post(tcrEndpoint + '/add-proxy-voting-for-principal', request)
    this.responseErrorCheck(response.data)

    // now update availableReceivedVotes for proxies
    let updateDelegationRequest = []

    for (let i = 0; i < proxies.length; i++) {
      updateDelegationRequest.push({
        actor: proxyUuid[i],
        projectId: projectId,
        receivedDelegateVotesDelta: Number(votesDiff[i])
      })
    }

    let updateDelegationResponse = await axios.post(tcrEndpoint + '/update-batch-received-delegate-votes', {
      requestList: updateDelegationRequest
    })
    this.responseErrorCheck(updateDelegationResponse.data)

    return JSON.stringify({ delegate: response.data, updateDelegation: updateDelegationResponse.data })
  }

  // Milestone event handlers
  registerProjectEvent = async (job) => {
    let { projectId, admin, content } = job.data

    let uuid = await this.getId(admin)

    let request = {
      projectId: projectId,
      admin: uuid,
      content: content,
      blockTimestamp: moment().unix()
    }

    let response = await axios.post(tcrEndpoint + '/project', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  unRegisterProjectEvent = async (job) => {
    let { projectId } = job.data

    let request = {
      projectId: projectId
    }

    let response = await axios.post(tcrEndpoint + '/delete-project', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  addMilestoneEvent = async (job) => {
    let { projectId, milestoneId, content, objMetaCompact, objContent } = job.data

    // first add a new milestone
    let request = {
      projectID: projectId,
      milestoneId: Number(milestoneId),
      content: content,
      blockTimestamp: moment().unix()
    }
    let response = await axios.post(tcrEndpoint + '/add-milestone', request)
    this.responseErrorCheck(response.data)

    let objChangeResponse = await this.handleObjChanges(projectId, milestoneId, objMetaCompact, objContent)
    return JSON.stringify({ addMilestone: response.data, objChange: objChangeResponse })
  }

  removeMilestoneEvent = async (job) => {
    let { projectId, milestoneId } = job.data
    let request = {
      projectId: projectId,
      milestoneId: Number(milestoneId)
    }
    let response = await axios.post(tcrEndpoint + '/delete-milestone', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  activateMilestoneEvent = async (job) => {
    let { projectId, milestoneId, startTime } = job.data
    let request = {
      projectId: projectId,
      milestoneId: Number(milestoneId),
      startTime: Number(startTime),
      blockTimestamp: moment().unix()
    }
    let response = await axios.post(tcrEndpoint + '/activate-milestone', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  finalizeMilestoneEvent = async (job) => {
    let { projectId, milestoneId, endTime } = job.data
    let request = {
      projectId: projectId,
      milestoneId: Number(milestoneId),
      endTime: Number(endTime),
      blockTimestamp: moment().unix()
    }
    let response = await axios.post(tcrEndpoint + '/finalize-milestone', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  addObjEvent = async (job) => {
    let { projectId, milestoneId, objId, content } = job.data
    let request = {
      projectId: projectId,
      milestoneId: Number(milestoneId),
      objectiveId: Number(objId),
      content: content,
      blockTimestamp: moment().unix()
    }
    let response = await axios.post(tcrEndpoint + '/objective', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  removeObjEvent = async (job) => {
    let { projectId, milestoneId, objId } = job.data
    let request = {
      projectId: projectId,
      milestoneId: Number(milestoneId),
      objectiveId: Number(objId)
    }
    let response = await axios.post(tcrEndpoint + '/delete-objective', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  rateObjEvent = async (job) => {
    let { proxy, projectId, milestoneId, ratings, weight, comment } = job.data

    let proxyUuid = await this.getId(proxy)

    let responseList = []
    for (let i = 0; i < ratings.length; i = i + 2) {
      let request = {
        projectId: projectId,
        milestoneId: Number(milestoneId),
        objectiveId: Number(ratings[i]),
        voter: proxyUuid,
        rating: Number(ratings[i + 1]),
        weight: Number(weight)
      }
      let response = await axios.post(tcrEndpoint + '/rating-vote', request)
      this.responseErrorCheck(response.data)
      responseList.push(response.data)
    }

    let commentBoardId = 'obj-comment-' + projectId + '-' + milestoneId
    // publish comment as a post
    let requestComment = {
      actor: proxyUuid,
      boardId: '0x' + sha3(commentBoardId),
      parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      postHash: '0x' + sha3(commentBoardId + '-' + proxyUuid),
      typeHash: '0x2fca5a5e',
      content: JSON.parse(comment)
    }
    let responseComment = await axios.post(feedEndpoint + '/feed-post', requestComment)
    this.responseErrorCheck(responseComment.data)
    return JSON.stringify({ rate: responseList, comment: responseComment.data })
  }

  unregisterUserEvent = async (job) => {
    let { publicKey } = job.data
    let uuid = await this.getId(publicKey)
    let request = {
      actor: uuid
    }
    let response = await axios.post(feedEndpoint + '/deactivate-actor', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  finalizeValidatorsEvent = async (job) => {
    let { projectId, milestoneId, proxies } = job.data
    let proxyUuidList = []
    for (let p of proxies) {
      proxyUuidList.push(await this.getId(p))
    }
    let request = {
      projectId: projectId,
      milestoneId: Number(milestoneId),
      validators: proxyUuidList
    }

    let response = await axios.post(tcrEndpoint + '/finalize-validators', request)
    this.responseErrorCheck(response.data)
    return JSON.stringify(response.data)
  }

  eventListener = async (e) => {
    await this.q.add(e.event, e.returnValues)
  }
}

async function main () {
  var eventHandler = new EventHandler()
  eventHandler.start()
  var c = new Contract()
  await c.addEventListener(eventHandler.eventListener)
  await c.loadContract()
}

main()
