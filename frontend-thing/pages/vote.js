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
  
    const getProviderOrSigner = async (needSigner = false) => {
      // Connect to Metamask
      // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
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
        });
      }
    }, [])
  
    const getUserBalance = async ()=>{
      const signer = await getProviderOrSigner(true);
      const addressSigner = await signer.getAddress();
      const amfContract = new Contract(AMF_ADDRESS, AMF_ABI, signer);
      const balance = await amfContract.balances(addressSigner);
      setUserBalance(parseInt(balance.toString()));
    }
    
    function renderVoteTab(){
        return (<div>
        Vote on a proposal
        </div>)
    }
  
    return (
      <div className={styles.main}>
        {renderVoteTab()}
      </div>
    )
  }
  