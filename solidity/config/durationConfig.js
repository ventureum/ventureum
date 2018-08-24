const rootDir = '../'

import { duration } from 'openzeppelin-solidity/test/helpers/increaseTime'

const env = require(rootDir + '.env.json')

export function getDurationConfig () {
  let DurationConfig = {
    refundDuration: duration.days(30),
    minMilestoneLength: duration.days(60),
    ratingStageMaxStartTimeFromEnd: duration.days(30),
    ratingStageMinStartTimeFromBegin: duration.days(7),
    refundStageMinStartTimeFromEnd: duration.days(7),
    applyStageLength: duration.days(7),
    commitStageLength: duration.days(1),
    revealStageLength: duration.days(1)
  }

  if (env.durationConfig === "test") {
    DurationConfig = {
      refundDuration: duration.minutes(1),
      minMilestoneLength: duration.minutes(20),
      ratingStageMaxStartTimeFromEnd: duration.minutes(10),
      ratingStageMinStartTimeFromBegin: duration.minutes(5),
      refundStageMinStartTimeFromEnd: duration.minutes(5),
      applyStageLength: duration.minutes(10),
      commitStageLength: duration.minutes(5),
      revealStageLength: duration.minutes(5)
    }
  }

  if (env.durationConfig === "local") {
    DurationConfig = {
      refundDuration: duration.minutes(1),
      minMilestoneLength: duration.minutes(10),
      ratingStageMaxStartTimeFromEnd: duration.minutes(5),
      ratingStageMinStartTimeFromBegin: duration.minutes(2),
      refundStageMinStartTimeFromEnd: duration.minutes(2),
      applyStageLength: duration.minutes(5),
      commitStageLength: duration.minutes(2),
      revealStageLength: duration.minutes(2)
    }
  }

  DurationConfig.MaxScore = 5

  return DurationConfig
}

