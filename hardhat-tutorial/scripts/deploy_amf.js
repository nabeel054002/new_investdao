const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const {BigNumber} = require("ethers");

async function main() {
    const AMFV1 = await ethers.getContractFactory("AMFV1");
    const deployedAMFV1 = await AMFV1.deploy("0xE592427A0AEce92De3Edee1F18E0157C05861564");
    await deployedAMFV1.deployed();
    console.log("Address of AMF:", deployedAMFV1.address);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
