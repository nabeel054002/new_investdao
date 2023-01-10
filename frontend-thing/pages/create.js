import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import React, {useState, useRef, useEffect} from "react";
import {Contract, providers, BigNumber, utils} from "ethers";
import Web3Modal from "web3modal";
import {AMF_ADDRESS, AMF_ABI} from "../constants/index.js";

export default function create() {

    const web3ModalRef = useRef();
  
    const [walletConnected, setWalletConnected] =  useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [tokenName, setTokenName] = useState("");
    const [tokenAddress, setTokenAddress] = useState("");
    const [tokenDecimals, setTokenDecimals] = useState(0);
  
    const getProviderOrSigner = async (needSigner = false) => {
      // Connect to Metamask
      // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    //   console.log(web3ModalRef.current);
    //   await test();
        const json = web3ModalRef.current
        console.log(json)
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

    
    
    const createProposal = async ()=>{
        const signer = await getProviderOrSigner(true);
        const amfContract = new Contract(AMF_ADDRESS, AMF_ABI, signer);
        const tx = await amfContract.createProposal(tokenAddress, tokenName, tokenDecimals);//function createProposal(address _tokenAddress, string calldata _tokenName, uint8 _decimals)
        await tx.wait();
    }

    const getUserBalance = async ()=>{
      const signer = await getProviderOrSigner(true);
      const addressSigner = await signer.getAddress();
      const amfContract = new Contract(AMF_ADDRESS, AMF_ABI, signer);
      const balance = await amfContract.balanceOf(addressSigner);
      setUserBalance(parseInt(balance.toString()));
    }
    
    function renderCreateProposalsTab(){
        return (<div>
            Create a proposal
            {/* createProposal(address _tokenAddress, string calldata _tokenName, uint8 _decimals) */}
            <form>
            <br/>
            <br/>
            <div>
                Token Name<br/>
                <input type="text" onChange={(e)=>{
                    // console.log(e.target.value);
                    setTokenName(e.target.value)
                }
                }></input><br/>
                <br/>
            </div>
            <div>
                Token Address<br/>
                <input type="text" onChange = {(e)=>{
                    setTokenAddress(e.target.value)
                }}></input><br></br>
                <br/>
            </div>
            <div>
                Decimals<br/>
                <input type="number" onChange = {(e)=>{
                    setTokenDecimals(e.target.value)
                }}></input><br/>
            </div>
                <input type="submit" onClick = {
                    createProposal()
                }></input>
            </form>
        </div>)
    }
  
    return (
      <div className={styles.main}>
        {renderCreateProposalsTab()}
      </div>
    )
  }
  /**
   * 
   * 
   */