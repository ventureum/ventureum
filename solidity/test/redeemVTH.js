var VTHTokenClassB = artifacts.require("VTHTokenClassB");
var VGTHToken = artifacts.require("VGTHToken");

contract('VTHTokenClassB', function(accounts) {
    contract('VGTHToken', function(accounts) {
        it("Should be able to redeem 100 VTH from VGTH", async function() {
            var VTHInstance = await VTHTokenClassB.deployed();
            var VGTHInstance = await VGTHToken.deployed();

            await VGTHInstance.transfer(accounts[1], 100, {from:accounts[0]});
            await VGTHInstance.setRedemptionTargetToken(VTHInstance.address, true, {from:accounts[0]});
            await VTHInstance.redeemFrom(VGTHInstance.address, {from:accounts[1]});

            var VTHBal = (await VTHInstance.balanceOf.call(accounts[1])).valueOf();
            assert.equal(VTHBal, "100", "VTH Balance is not 100 mVTH");
        });
    });
});


