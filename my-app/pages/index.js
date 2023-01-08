import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import React, {useState, useRef, useEffect} from "react";
import {Contract, providers, BigNumber, utils} from "ethers";
import Web3Modal from "web3modal";
import {MUTUALFUND, MUTUALFUND_ABI} from "../constants";

export default function Home() {
  //const [addBalance, setAddBalance] = useState(0);
  //step one: connect wallet to appropriate network
  const [walletConnected, setWalletConnected] = useState(false);
  //const [users, setUsers] = useState([]);
  const web3ModalRef = useRef();
  const zero = BigNumber.from(0);
  const [balance, setBalance] = useState("");
  const [recentTime,setRecentTime] = useState("");
  const [userBalance, setUserBalance] = useState(0);
  const [proposalsTab, setProposalsTab] = useState("");
  const [proposals, setProposals] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [deadline_size, setDeadline_size] = useState(0);
  const [proposalTokenAddress, setProposalTokenAddress] = useState("");
  const [propopsalTokenName, setProposalTokenName] = useState("");
  const [proposalDecimals, setProposalDecimals] = useState(0);
  const [loading, setLoading] = useState(false);

  const getBalance = async ()=>{
    const provider = await getProviderOrSigner();
    const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, provider);
    const balance_local = await provider.getBalance(mfContract.address);
    setBalance(balance_local.toString());
  }
  const getUserBalance = async ()=>{
    const signer = await getProviderOrSigner(true);
    const addressSigner = await signer.getAddress();
    const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, signer);
    const balance = await mfContract.balances(addressSigner);
    setUserBalance(parseInt(balance.toString()));
    //I am implementing the mapping by myself instead of usign the ERC20 methods, as this is for learning purposes
    //const userBalance = await mfContract.balances()
  }
  const getRecentTime = async()=>{
    const provider = await getProviderOrSigner();
    const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, provider);
    const recentTime_local = await mfContract.recentTime();
    setRecentTime(recentTime_local.toString());
  }
  const takePart = async()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, signer);
      const tx = await mfContract.takePart({
        value:utils.parseEther("0.011"),
      })
      await getBalance();
    }
    catch(err){
      console.error(err);
    }
  }

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 80001) {
      window.alert("Change the network to Hardhat Fork");
      throw new Error("Change network to Hardhat Fork");
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
  const fetchDeadline = async()=>{
    try{
      const provider = await getProviderOrSigner();
    const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, provider);
    const deadlinesize = await mfContract.deadline_size();
    setDeadline_size(parseInt(deadline_size.toString()));
    const deadlines_local = [];
    for( let i=0; i<deadline_size; i++){
      const deadline = await mfContract.deadline(i);
      deadlines_local.push(deadline);
    }
    setDeadlines(deadlines_local);
    }catch(err){
      console.error(err);
      window.alert(err);
    }
    
  }
  const fetchAllProposals = async () =>{
    try{
      //await fetchDeadline();
    const provider = await getProviderOrSigner();
    const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, provider);
    const deadlinesize = await mfContract.deadline_size();
    const proposals_local = [];
    for(let i=0; i<deadlinesize; i++){
      const token = await mfContract.deadline(i);
      const prop = await mfContract.proposals(token[0]);
      if(prop){
        proposals_local.push(prop);
      }
    }
    setProposals(proposals_local);
    // const tokenAddresses = await mfContract
    }catch(err){
      console.error(err);
    }
    
  }
  const fetchProposalsByAddress = async(address)=>{
    try{
      const provider = await getProviderOrSigner();
    const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, provider);
    const proposal = await mfContract.proposals(address);
    const parsedProposal = {
      tokenAddress:proposal.tokenAddress.toString(),
      tokenName:proposal.tokenName.toString(),
      votesForYes:proposal.votesForYes.toString(),
      votesForNo:proposal.votesForNo.toString(),
    }
    return parsedProposal;
    }catch(err){
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
        getBalance();
        getUserBalance();
        getRecentTime();
      });
    }
  }, [])
  // useEffect(()=>{
  //   fetchDeadline();
  // }, [proposalsTab])

  useEffect(() => {
    if (proposalsTab === "vote") {
      console.log("here_this_this")
      fetchAllProposals();
    }
  }, [proposalsTab]);

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
            <button onClick = {()=>{setProposalsTab("create")}}>Create Proposals</button>
          </div>
          <div>
            <h3>To vote on an existing proposal</h3>
            <button onClick = {()=>{setProposalsTab("vote")}}>Vote on a proposal</button>
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
  const voteOnProposal = async(tokenAddress, vote)=>{
    try{
      const signer = await getProviderOrSigner(true);
      const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, signer);
      if(vote==="y"){
        const tx = await mfContract.voteOnProposal(tokenAddress, 0);
        setLoading(true);
        await tx.wait();
        setLoading(false);
        await fetchAllProposals();
      } else{
        const tx = await mfContract.voteOnProposal(tokenAddress, 1);
        setLoading(true);
        await tx.wait();
        setLoading(false);
        await fetchAllProposals();
      }
    }catch(err){
      console.error(err);
    }
  }
  const createProposal = async()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const mfContract = new Contract(MUTUALFUND, MUTUALFUND_ABI, signer);
      const tx = await mfContract.createProposal(proposalTokenAddress, propopsalTokenName, proposalDecimals, {value:utils.parseEther("0.01")}); 
      setLoading(true);
      console.log(loading);
      await tx.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch(err){
      console.log("Error recievd at createProposal")
      console.error(err);
    }
  }
  function renderCreateProposalsTab(){
    return (
      <div>
        <input type="text" placeholder="Token Address" onChange={(e)=>{
          setProposalTokenAddress(e.target.value)
        }}/>
        <input type="text" placeholder = "Token Name" onChange={(e)=>{
          setProposalTokenName(e.target.value)
        }}/>
        <input type="number" placeholder = "Token Decimals" onChange={(e)=>{
          setProposalDecimals(e.target.value)
        }}/>

        <button onClick={createProposal}>Create Proposal</button>
      </div>
    );
  }
  function renderVoteProposalsTab(){
    //fetchAllProposals();
    //console.log(proposals)
    return (<div>
    <h1>Vote on a proposal!!</h1>
      {proposals.map((p, index)=>(
        <div key={index}>
        <h3>Proposal for {p.tokenName}</h3>
        <p>address of token is <b>{p.tokenAddress}</b></p>
        {/* <p>Votes for {p.votesForYes}</p> */}
        {/* <p>Votes against {p.votesForNo}</p> */}
        <p>Votes for <b>yes</b> = <b>{p.votesForYes.toString()}</b></p>
        <p>Votes for <b>no</b> = <b>{p.votesForNo.toString()}</b></p>
        {console.log(p.votesForNo.toString())}
        <button className = {styles.button} onClick={()=>{
          voteOnProposal(p.tokenAddress, "y");
        }}>Vote Yes</button>
        <button className={styles.button} onClick={()=>{
          voteOnProposal(p.tokenAddress, "n");
        }}>Vote No</button>
        </div>
      ))}
    </div>)
  }
  function renderTabs(){
    if(proposalsTab=="create"){
      //this thing can be done twice... console.log(proposalsTab);
      return renderCreateProposalsTab();
    } else if (proposalsTab=="vote"){
      return renderVoteProposalsTab();
      //this thing can be done twice as well... return renderVoteProposalsTab();
    }
    return null;
  }
  return (
    <div>
    <Head>
      <title>Fund DAO</title>
      <meta name="description" content="CryptoDevs DAO"/>
    </Head>
    <div className = {styles.main}>
      {renderTakePart()}
      {/* {renderProposals()} */}
      {renderTabs()}
      {/* {console.log(proposals)} */}
    </div>
    <footer>
      Trynna build a project from scratch....
    </footer>
    </div>
    
  )
}
