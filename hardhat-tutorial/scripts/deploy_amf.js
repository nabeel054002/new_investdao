const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const {BigNumber} = require("ethers");

async function main() {
    const MutualFund = await ethers.getContractFactory("AMFV1");
    const deployedMutualFund = await MutualFund.deploy(BigNumber.from(60));
    //the time that is to be actually implemented in the second arg is 1 day = 60*60*24, for now, i am keeping it as 2 minutes, hence it will be like 14 minutes before a proposal is acted upone
    await deployedMutualFund.deployed();
    console.log("Address of AMF:", deployedMutualFund.address);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
