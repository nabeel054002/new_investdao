const {ethers} = require("ethers");
require('dotenv').config()

const MUMBAI_PROVIDER=new ethers.providers.JsonRpcProvider(process.env.QUICKNODE_HTTP_URL);
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_PRIVATE_KEY=process.env.PRIVATE_KEY;

const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY);
const connectedWallet = wallet.connect(MUMBAI_PROVIDER);


async function main(){}

main()