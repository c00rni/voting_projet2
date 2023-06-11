var SolidityContract = artifacts.require("Voting");

module.exports = function(deployer) {
  // Deploy the SolidityContract contract as our only task
  deployer.deploy(SolidityContract);
};