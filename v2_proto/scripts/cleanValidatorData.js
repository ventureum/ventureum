const parse = require('csv-parse')
var fs = require('fs')
const shake128 = require('js-sha3').shake128
const path = require('path')

/*
 *  Validator data structure
 *
 *  {
 *     actor: [uuid] shake128(username)
 *     userType: 'KOL'
 *     username: [string],
 *     photoUrl: [string],
 *     telegramId: '' temporarily empty
 *     phoneNumber: '' temporarily empty
 *     publicKey: '' temporarily empty
 *     content: {
 *       shortDescription: [string]
 *       description: [string]
 *       name: [string]
 *       successSCore: [float]
 *     }
 *  }
 *
 */

var validators = []

function getRawUUID (telegramId) {
  return '0x' + shake128(String(telegramId), 128)
}

function str2arr (str) {
  str = str.split('\'').join('') // remove '
  str = str.substring(1, str.length - 1)
  let arr = str.split(',')
  arr = arr.map((item) => item.replace(/^\s+|\s+$/g, '')) // remove leading and trailing spaces
  return arr
}

function filter (_d) {
  // must have rated >= 3 times
  let _ratings = str2arr(_d.Rating_Timeline_Name)
  let numRatings = _ratings.length

  return numRatings < 5 || _d.ICO_Success_Score < 20.0
}

function main () {
  var parser = parse({ delimiter: ',', columns: true, cast: true }, function (err, data) {
    if (err) throw new Error(err)
    for (let _d of data) {
      if (filter(_d)) continue
      let url = _d.url
      let username = url.split('/').slice(-1)[0]
      let _v = {
        actor: getRawUUID(username),
        userType: 'KOL',
        username: username,
        photoUrl: _d.Img_Url,
        telegramId: '',
        phoneNumber: '',
        publicKey: '',
        profileContent: JSON.stringify({
          shortDescription: _d.Description_Short,
          description: _d.Description_Long,
          name: _d.Title,
          successScore: parseFloat(_d.ICO_Success_Score)
        })
      }
      validators.push(_v)
    }
    console.log(`Number of validators: ${validators.length}`)
    fs.writeFile('kol_cleaned.json', JSON.stringify({ validators: validators }), 'utf8', function (err) {
      if (err) throw err
      console.log('complete')
    })
  })

  fs.createReadStream(path.join(__dirname, '/../kol_raw.csv')).pipe(parser)
}

main()
