var FlxSale = artifacts.require("FlxSale");
var Weth9 = artifacts.require("WETH9");

module.exports = function(deployer) {
  deployer.deploy(Weth9).then(function() {
    return deployer.deploy(FlxSale, Weth9.address);
  });
};
