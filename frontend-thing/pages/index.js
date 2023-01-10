import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import React, {useState, useRef, useEffect} from "react";
import {Contract, providers, BigNumber, utils} from "ethers";
import Web3Modal from "web3modal";
import {AMF_ADDRESS, AMF_ABI} from "../constants/index.js";

export default function Home() {

  const web3ModalRef = useRef()

  const [walletConnected, setWalletConnected] =  useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const zero = BigNumber.from("0");
  const [totalNumberOfTokens, setTotalNumberOfTokens] = useState(zero)

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    console.log(web3ModalRef.current);
    console.log(web3ModalRef.current.connect())
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 80001) {
      window.alert("Change the network to Mumbai");
      throw new Error("Change network to Mumbai");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const connectWallet = async()=>{
    try{
      await getProviderOrSigner();
      setWalletConnected(true);
    }
    catch(err){
      console.error(err);
    }
  }
  useEffect(()=>{
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network:"hardhat",
        providerOptions: {},
        disableInjectedProvider: false,
      })
      connectWallet().then(()=>{
        getUserBalance();
        getTotalNumberOfTokens();
      });
    }
  }, [walletConnected])

  const getUserBalance = async ()=>{
    const signer = await getProviderOrSigner(true);
    const addressSigner = await signer.getAddress();
    const amfContract = new Contract(AMF_ADDRESS, AMF_ABI, signer);
    const balance = await amfContract.balanceOf(addressSigner);
    setUserBalance(parseInt(balance.toString()));
  }

  const getTotalNumberOfTokens = async ()=>{
    const provider = await getProviderOrSigner();
    const amfContract = new Contract(AMF_ADDRESS, AMF_ABI, provider);
    const balance_local = await amfContract.totalSupply();
    setTotalNumberOfTokens(balance_local.toString());
  }
  
  const takePart = async()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const mfContract = new Contract(AMF_ADDRESS, AMF_ABI, signer);
      const tx = await mfContract.takePart({
        value:utils.parseEther("0.011"),
      })
      await getTotalNumberOfTokens();
    }
    catch(err){
      console.error(err);
    }
  }


  function renderTakePart(){
    if(userBalance){
      return (
        <div>
          <h2>You have {userBalance} Fund Tokens</h2>
        <div>
          <h3>To buy more and increase ownership in DAO</h3>
          <button onClick={takePart}>Click Here!</button>
          <div>
          <h3>To create a proposal, so that it might be included in this DAOs portfolio</h3>
            <a href="/create">Create a proposal</a>
          </div>
          <div>
            <h3>To vote on an existing proposal</h3>
            <a href="/vote">Vote on a proposal</a>
          </div>
        </div>
        </div>
      
      )
    } else{
      return (
        <div>
          <h2>You are not a part of the InvestDAO</h2>
          <h3>Wanna take part?</h3>
          <button onClick={takePart}>Take Part</button>
        </div>
      )
    }
  }

  return (
    <div className={styles.main}>
      {renderTakePart()}
    </div>
  )
}
