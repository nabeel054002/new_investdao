//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
//AMF = Autonomous mutual fund, the name doesnt exactly represent it, but sounds cool
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import './WMATIC.sol';

contract AMFV1 is ERC20Burnable, Ownable{

    ISwapRouter public immutable swapRouter;
    uint24 public constant poolFee = 3000;
    address[] public deadline;
    //to analyze t
    uint public deadline_size=0;
    uint256 constant price = 0.01 ether;

    address[] public users;

    cryptoBought[5] public Portfolio;
    uint8 public number=0;//to see what to do when the maximum number of assets have been reached 
    struct cryptoBought{
        address tokenAddress;
        string tokenName;
        uint8 decimals;
        uint256 timeBought;
    }//cryptoBough represents each asset present in the portfoio
    struct Proposal{
        address tokenAddress;
        string tokenName;
        uint8 decimals;
        uint256 peopleForYes;
        uint256 peopleForNay;
        uint256 votesForYes;
        uint256 votesForNo;
        mapping(address => uint256) voters;
        //mapping for address of voter to number of tokens he used to vote
        //if final score is positive we buy, else we dont.
    }
    enum Vote{
        Bullish,
        Bearish
    }
    mapping(address=>Proposal) public proposals;
    modifier  deadline_size_modifier {
        require(deadline.length>0, "no more proposals");
        //if anymore proposals are left
        _;
    }
    //Fund token is tracks the ownership in this dao, and CT is the one which we wanna invest in
    constructor(ISwapRouter _swapRouter) ERC20("FundToken","FD"){
        swapRouter = _swapRouter;
    }

    function takePart() payable public{
        //no need to have the minimum condition, it is unnecessary
        if(balanceOf(msg.sender)==0){
            users.push(msg.sender);
        }
        _mint(msg.sender, msg.value/price);
    }

    function createProposal(address _tokenAddress, string calldata _tokenName, uint8 _decimals) public payable{
        require(msg.value>=0.001 ether, "feestoadd = 0.001 ether");
        Proposal storage proposal = proposals[_tokenAddress];//Proposal is the structure being used to add the new proposal to
        proposal.tokenAddress = _tokenAddress;
        proposal.decimals = _decimals;
        proposal.peopleForYes=1;
        proposal.tokenName = _tokenName;
        proposal.peopleForNay = 0;
        proposal.votesForYes = balanceOf(msg.sender);
        proposal.votesForNo = 0;
        proposal.voters[msg.sender] = balanceOf(msg.sender);//need to do some var optimization here
        deadline.push(proposal.tokenAddress);
        deadline_size+=1;
    }

    function voteOnProposal(address _tokenAddress, Vote vote)public {
        require(proposals[_tokenAddress].voters[msg.sender] < balanceOf(msg.sender), "user already voted");
        if(vote==Vote.Bullish){
            proposals[_tokenAddress].peopleForYes+=1;
            proposals[_tokenAddress].votesForYes += (balanceOf(msg.sender) - proposals[_tokenAddress].voters[msg.sender]);
            proposals[_tokenAddress].voters[msg.sender] = balanceOf(msg.sender);
        }
        if(vote==Vote.Bearish){
            proposals[_tokenAddress].peopleForNay+=1;
            proposals[_tokenAddress].votesForNo += (balanceOf(msg.sender) - proposals[_tokenAddress].voters[msg.sender]);
            proposals[_tokenAddress].voters[msg.sender] = balanceOf(msg.sender);
        }
    }

    function swapExactInputSingle(uint256 amountIn, address coinIn, address coinOut) payable public returns (uint256 amountOut) {

        TransferHelper.safeTransferFrom(coinIn, msg.sender, address(this), amountIn);
        TransferHelper.safeApprove(coinIn, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: coinIn,
                tokenOut: coinOut,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = swapRouter.exactInputSingle(params);
    }

    function executeProposal () public{
        //tokenAddress to have the value of 
        //this function will automatically be executed with the function calling it with input as the earliest 
        address tokenAddress = deadline[0];
        if(proposals[tokenAddress].votesForYes>proposals[tokenAddress].votesForNo){
            if(number<4){
                for(uint8 i=0; i<number; i++){
                    address token = Portfolio[i].tokenAddress;
                    uint256 amountIn = (ERC20(token).balanceOf(address(this)))/(number+1);//for initially 3 tokens, now if we have 4 tokens, then 
                    swapExactInputSingle(amountIn, token, tokenAddress);//price manipulations?
                }
                cryptoBought storage crypto = Portfolio[number+1];
                crypto.tokenAddress = tokenAddress;
                crypto.tokenName = proposals[tokenAddress].tokenName;
                crypto.decimals = proposals[tokenAddress].decimals;
                crypto.timeBought = block.timestamp;
                number++; //i am assuming this handles the execution appropo
                uint256 toBuyAmount = (address(this).balance)/number;
                for(uint8 i=0; i<number; i++){
                    swapExactInputMatic(toBuyAmount, Portfolio[i].tokenAddress);//how to send native matic tokens
                }

            } else{
                cryptoBought storage crypto = Portfolio[number%5];
                number++;
                number = number%5;
                swapExactInputSingle(ERC20(crypto.tokenAddress).balanceOf(address(this)), crypto.tokenAddress, tokenAddress);
                crypto.tokenAddress = tokenAddress;
                crypto.tokenName = proposals[tokenAddress].tokenName;
                crypto.decimals = proposals[tokenAddress].decimals;
                crypto.timeBought = block.timestamp;
                number++;
                uint256 toBuyAmount = (address(this).balance)/5;
                //we also have to take care of the eth that we got through more members joining in, since the last function call
                for(uint8 i=0; i<5; i++){
                    swapExactInputMatic(toBuyAmount, Portfolio[i].tokenAddress);//how to send matic through this function call
                }
            }
        }
        delete proposals[tokenAddress];
        delete deadline[0];
    }

    function swapExactInputMatic(uint256 amountIn, address tokenOut) payable public returns(uint256 amountOut){
        address payable WMATICaddress=payable(0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889);
        WMATIC wmat = WMATIC(WMATICaddress);
        wmat.deposit{value:amountIn}();
        wmat.approve(address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WMATICaddress,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = swapRouter.exactInputSingle(params);
    }
    //1 more functions
    function liquidateOwnership(uint256 amountLiquidate) public {
        uint256 balance_user = ERC20(address(this)).balanceOf(msg.sender);
        require(amountLiquidate <= balance_user, "more than u hv");
        uint256 total_balance = totalSupply();
        uint256 ratio = (balance_user/total_balance)*(amountLiquidate/balance_user);
        uint256 amountEth = (address(this).balance)*(ratio);
        payable(msg.sender).transfer(amountEth);
        uint8 i;
        uint256 balance;
        for(i=0; i<5; i++){
            balance = ERC20(Portfolio[i].tokenAddress).balanceOf(address(this));
            ERC20(Portfolio[i].tokenAddress).transfer(msg.sender, balance*ratio);
        }
        ERC20Burnable(address(this)).burnFrom(msg.sender, amountLiquidate);//burn already takes care of balanceOf function
    }
}
