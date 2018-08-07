'use strict'

const rootDir = '../../'

const OwnSolConfig = require(rootDir + 'config/ownSolConfig.js')
const ThirdPartySolConfig = require(rootDir + 'config/thirdPartySolConfig.js')

const BigNumber = require('bignumber.js')

module.exports = function (artifacts) {
  const _ownSolConstants = OwnSolConfig.default(artifacts)
  const _thirdPartySolConstants = ThirdPartySolConfig.default(artifacts)

  const Parameterizer = _ownSolConstants.Parameterizer
  const TimeSetter = _thirdPartySolConstants.TimeSetter

  const CHALLENGE_DEPOSIT = new BigNumber(Parameterizer.paramDefaults.minDeposit / 2)
  const ONE_YEAR = TimeSetter.OneYear

  return {
    PROJECT_LIST : ['project0', 'project1', 'project2', 'project3'],
    ETH_AMOUNT : 10000000000,
    TOKEN_SALE_RATE : 5,
    SALT : 12345,
    VOTE_FOR : 1,
    AGAINST : 0,
    VOTE_NUMBER : 1000,
    PURCHASER_DEPOSIT : 10000,

    /* ----- Project State --------- */
    PROJECT_STATE: {
      NOT_EXIST : 0,
      APP_SUBMITTED : 1,
      APP_ACCEPTED : 2,
      TOKEN_SALE : 3,
      MILESTONE : 4,
      COMPLETE : 5
    },

    /* ----- Challenge info--------- */
    CHALLENGE_DEPOSIT : CHALLENGE_DEPOSIT,
    CHALLENGE_REWARD :
      new BigNumber(CHALLENGE_DEPOSIT * Parameterizer.paramDefaults.dispensationPct / 100),

    /* ----- Milestone Mock Data --------- */
    MILESTONE_LENGTH :
      [ONE_YEAR, (ONE_YEAR * 2), (ONE_YEAR * 3), (ONE_YEAR * 4), (ONE_YEAR * 5)],
    MILESTONE_OBJS :
    [['obj10', 'obj11'],
      ['obj20', 'obj21'],
      ['obj30', 'obj31'],
      ['obj40', 'obj41'],
      ['obj50', 'obj51']],
    MILESTONE_OBJ_TYPES :
    [['type10', 'type11'],
      ['type20', 'type21'],
      ['type30', 'type31'],
      ['type40', 'type41'],
      ['type50', 'type51']],
    MILESTONE_OBJ_MAX_REGULATION_REWARDS :
    [[100, 100],
      [200, 200],
      [300, 300],
      [400, 400],
      [500, 500]],
    MILESTONE_WEI_LOCKED : [10000, 20000, 30000, 40000, 50000],

    /* ----- RegulatingRating Data --------- */
    LENGTH_FOR_RATING_STAGE : (4 * TimeSetter.OneWeek),
    INTERVAL_FOR_RATING_STAGE : (2 * TimeSetter.OneWeek),
    DELAY_LENGTH : 0,
    POLL_LENGTH : 7,
    TOTAL_VOTES_LIMIT : 1000,

    /* ----- RegulatingRating Data --------- */
    PURCHASER1_REFUND : [100, 110, 120, 130, 140],
    PURCHASER2_REFUND : [200, 210, 220, 230, 240],
    PURCHASER3_REFUND : [300, 310, 320, 330, 340],

    /* ------- Jump info Data --------- */
    STATES: {
      VTCR_WHITELIST : 1,
      ADD_MILESTONE : 2,
      TOKEN_SALE : 3,
      MILESTONE_BEGIN : 4,
      MILESTONE_ACTIVATE : 5,
      MILESTONE_REGULATING : 6,
      MILESTONE_REFUND : 7,
      DEFAULT_MILESTONE_ID : 0
    }
  }
}
