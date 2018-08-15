const rootDir = '../'

import { duration } from 'openzeppelin-solidity/test/helpers/increaseTime'

const env = require(rootDir + '.env.json')

export function getDurationConfig () {
  let DurationConfig = {
    refundDuration: duration.days(30),
    minMilestoneLength: duration.days(60),
    ratingStageMaxStartTimeFromEnd: duration.days(30),
    refundStageMinStartTimeFromEnd: duration.days(7),
    applyStageLength: duration.minutes(5),
    commitStageLength: duration.minutes(1),
    revealStageLength: duration.minutes(1)
  }

  if (env.durationConfig === "test") {
    DurationConfig = {
      refundDuration: duration.minutes(1),
      minMilestoneLength: duration.minutes(5),
      ratingStageMaxStartTimeFromEnd: duration.minutes(1),
      refundStageMinStartTimeFromEnd: duration.minutes(4),
      applyStageLength: duration.minutes(2),
      commitStageLength: duration.minutes(1),
      revealStageLength: duration.minutes(1)
    }
  }
  return DurationConfig
}

