var RepSys = artifacts.require("RepSys")

web3.eth.getAccountsPromise = function () {
  return new Promise(function (resolve, reject) {
    web3.eth.getAccounts(function (e, accounts) {
      if (e != null) {
        reject(e);
      } else {
        resolve(accounts);
      }
    });
  });
};

module.exports = async function(callback) {
  var accounts = await web3.eth.getAccountsPromise();
  var repSys = await RepSys.deployed();

  var root = accounts[0]
  var userKOL = accounts[1]
  var userProjectFounder = accounts[2]

  const typeKOL = "0xf4af7c06"
  const typeProjectFounder = "0x4b36994b"

  let rv = await repSys.owner.call()
  await repSys.registerUser(userKOL, typeKOL, 1000, {from: root});
}
