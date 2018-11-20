var RepSys = artifacts.require("./RepSys.sol")
var Milestone = artifacts.require("./Milestone.sol")

module.exports = function(deployer) {
  deployer.deploy(RepSys).then(function () {
    return deployer.deploy(Milestone, RepSys.address)
  })
};
