const parse = require('csv-parse')
const fs = require('fs')
const path = require('path')
const uuidParse = require('uuid-parse')
const kolInfo = require('../kol_cleaned.json')
const moment = require('moment')
// let cleanProjectData = []

function str2arr (str) {
  str = str.split('\'').join('') // remove '
  str = str.substring(1, str.length - 1)
  let arr = str.split(',')
  arr = arr.map((item) => item.replace(/^\s+|\s+$/g, '')) // remove leading and trailing spaces
  return arr
}

function parseMilestoneInfo (str) {
  let arr = str.split(/', '|', \"|\", '/g)
  arr = arr.map((item) => item.replace(/^\s+|\s+$/g, '')) // remove leading and trailing spaces
  arr[0] = arr[0].substring(2)
  arr[arr.length - 1] = arr[arr.length - 1].substring(0, arr[arr.length - 1].length - 2)
  arr = arr.map(item => {
    return item.trim() // trim again
  })
  return arr
}

function ratingString2Arr (str) {
  str = str.replace(/'|\(|\)/g, '')
  str = str.substring(1, str.length - 1)
  let arr = str.split(',')
  arr = arr.map((item) => {
    const r = item.replace(/^\s+|\s+$/g, '')
    return Number(r)
  }) // remove leading and trailing spaces
  return arr
}

function getAverageRatings (ratings) {
  let avg = []
  for (let i = 0; i < ratings.length; i += 3) {
    const rating = Math.round((ratings[i] + ratings[i + 1] + ratings[i + 2]) / 3)
    avg.push(rating)
  }
  return avg
}

function getUUID (rawUUID) {
  const hashBytes = Buffer.from(rawUUID.substring(2), 'hex')
  const id = uuidParse.unparse(hashBytes)
  return id
}

function main () {
  const parser = parse({ delimiter: ',', columns: true, cast: true }, function (err, data) {
    if (err) throw new Error(err)
    // Project Data
    let cleanProjectData = data.map(project => {
      const projectName = project.TL_1_Name.trim()
      const logo = project.TL_41_Img_Icon_Url
      let regex = /icons/
      const wideLogo = project.TL_41_Img_Icon_Url.replace(regex, 'logos')
      const shortDescription = project.TL_2_Desc_Short
      const video = project.TL_6_Video_Url
      const description = project.TL_3_Desc_Long

      let teamMemberNameArray = str2arr(project.Tab_Team_1_person_name)
      let teamMemberTitleArray = str2arr(project.Tab_Team_2_title)
      let teamMemberLinkArray = str2arr(project.Tab_Team_6_linkedin)
      const teamMemberArray = teamMemberNameArray.map((name, i) => {
        return {
          name: name,
          title: teamMemberTitleArray[i],
          link: teamMemberLinkArray[i]
        }
      })

      const team = {
        teamSize: teamMemberArray.length,
        members: teamMemberArray
      }

      const corporationInfo = {
        location: {
          country: project.Country
        },
        team: team
      }
      const category = str2arr(project.TL_5_Categories)[0]
      const website = project.Links_WWW
      const whitepaper = project.Links_White_Paper
      const token = {
        symbol: project.Tab_Financial_Token,
        price: project['Tab_Financial_Price in ICO'],
        platform: project['Tab_Financial_Platform'],
        accept: project['Tab_Financial_Accepting'].split(',')
      }
      const socialLinks = [
        {
          type: 'telegram',
          link: project['Links_Telegram']
        }, {
          type: 'github',
          link: project['Links_GitHub']
        }, {
          type: 'reddit',
          link: project['Links_Reddit']
        }, {
          type: 'twitter',
          link: project['Links_Twitter']
        }, {
          type: 'facebook',
          link: project['Links_Facebook']
        }, {
          type: 'slack',
          link: project['Links_Slack']
        }
      ]
      return {
        projectName,
        logo,
        wideLogo,
        shortDescription,
        video,
        description,
        corporationInfo,
        category,
        website,
        whitepaper,
        token,
        socialLinks
      }
    })

    // Milestone data
    let cleanMilestoneData = data.map(project => {
      const msDateArray = str2arr(project.Tab_MS_2_Condition)
      const msProductionArray = parseMilestoneInfo(project.Tab_MS_3_Product)
      const msTitle = parseMilestoneInfo(project.Tab_MS_2_Condition)
      const projectMs = msProductionArray.map((ms, i) => {
        const msContent = {
          title: msTitle[i],
          description: ms,
          expectedStartTime: msDateArray[i],
          expectedEndTime: msDateArray[i]
        }
        const msObj = {
          title: msTitle[i],
          description: ms
        }
        return {
          milestone: msContent,
          objective: msObj
        }
      })

      return {
        projectName: project.TL_1_Name.trim(),
        milestones: projectMs
      }
    })

    // build KOL UUID to name dictionary
    let dictionary = {}
    kolInfo.validators.forEach(validator => {
      const name = JSON.parse(validator.profileContent).name
      const UUID = getUUID(validator.actor)
      dictionary[name] = UUID
    })
    // KOL rating data
    let projectRatings = data.map(project => {
      const projectName = project.TL_1_Name.trim()
      const kolNames = str2arr(project.Tab_Ratings_1_Name)
      const comments = parseMilestoneInfo(project.Tab_Ratings_2_1_Comments)
      const timeStamps = parseMilestoneInfo(project.Tab_Ratings_2_Title).map(item => {
        let index = item.indexOf('Modified on')
        let time
        if (index >= 0) {
          time = item.substring(index + 12)
        } else {
          index = item.indexOf('Rated on')
          time = item.substring(index + 9)
        }
        return time
      })
      let rawRatings = ratingString2Arr(project.Tab_Ratings_3_Rates)
      let averageRatings = getAverageRatings(rawRatings)
      let actorRatings = kolNames.map((kol, i) => {
        return {
          name: kol,
          actor: dictionary[kol],
          rating: averageRatings[i],
          comment: {
            title: 'comment',
            text: comments[i]
          },
          timestamp: new Date(timeStamps[i])
        }
      })
      actorRatings = actorRatings.filter(item => {
        return item.actor !== undefined
      })
      return {
        projectName: projectName,
        ratings: actorRatings
      }
    })
    cleanProjectData = { projects: cleanProjectData }
    fs.writeFile('cleanedProjectData.json', JSON.stringify(cleanProjectData, null, 2), 'utf8', () => { console.log('CleanedProjectData done') })

    cleanMilestoneData = { projectMilestones: cleanMilestoneData }
    fs.writeFile('cleanedMilestoneData.json', JSON.stringify(cleanMilestoneData, null, 2), 'utf8', () => { console.log('CleanedMilestoneData done') })

    projectRatings = { projectRatings: projectRatings }
    fs.writeFile('cleanedRatingData.json', JSON.stringify(projectRatings, null, 2), 'utf8', () => { console.log('CleanedRatingData done') })
  })

  fs.createReadStream(path.join(__dirname, '/../rawProjectData.csv')).pipe(parser)
}

main()
