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

    event swapsImplemented(address swapper, uint256 quantity, uint256 timestamp);

    uint24 public constant poolFee = 3000;
    uint public interval;
    struct propsl{
        address deadlineToken;
        uint deadlineTime;
    }
    propsl[] public deadline;
    uint public deadline_size=0;

    uint public recentTime;

    address public recentAddress;

    uint256 constant price = 0.01 ether;

    address[] public users;
    mapping (address=>uint256) public balances;

    cryptoBought[5] public Portfolio;
    uint8 public number=0;
    struct cryptoBought{
        address tokenAddress;
        string tokenName;
        uint8 decimals;
        uint256 timeBought;
    }
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
    constructor(uint updateInterval, ISwapRouter _swapRouter) ERC20("FundToken","FD"){
        recentTime = block.timestamp;
        //last execution time
        interval = 7*updateInterval;
        //periodicity type interval
        swapRouter = _swapRouter;
    }

    function takePart() payable public{
        require(balances[msg.sender]*10 + msg.value>=price, "atleast 0.1 ether worth");
        //msg.value/price is not gonna give an accurate way to have fractional tokens
        if(balances[msg.sender]==0){
            users.push(msg.sender);
        }
        balances[msg.sender] += msg.value/price;
        _mint(msg.sender, msg.value/price);

    }

    function createProposal(address _tokenAddress, string calldata _tokenName, uint8 _decimals) public payable{
        require(msg.value>=0.001 ether, "feestoadd = 0.1 ether");
        Proposal storage proposal = proposals[_tokenAddress];
        proposal.tokenAddress = _tokenAddress;
        proposal.decimals = _decimals;
        proposal.peopleForYes=1;
        proposal.tokenName = _tokenName;
        proposal.peopleForNay = 0;
        proposal.votesForYes = balances[msg.sender];
        proposal.votesForNo = 0;
        proposal.voters[msg.sender] = balances[msg.sender];
        recentTime = block.timestamp;
        recentAddress = proposal.tokenAddress;
        deadline.push(propsl(recentAddress, recentTime));
        deadline_size+=1;
        
    }

    function voteOnProposal(address _tokenAddress, Vote vote)public {
        require(proposals[_tokenAddress].voters[msg.sender] < balances[msg.sender], "user already voted");
        if(vote==Vote.Bullish){
            proposals[_tokenAddress].peopleForYes+=1;
            proposals[_tokenAddress].votesForYes += (balances[msg.sender] - proposals[_tokenAddress].voters[msg.sender]);
            proposals[_tokenAddress].voters[msg.sender] = balances[msg.sender];
        }
        if(vote==Vote.Bearish){
            //assuming their vote remains the same even after extra minting
            proposals[_tokenAddress].peopleForNay+=1;
            proposals[_tokenAddress].votesForNo += (balances[msg.sender] - proposals[_tokenAddress].voters[msg.sender]);
            proposals[_tokenAddress].voters[msg.sender] = balances[msg.sender];
        }
        //can be greater since the individual can liquidate ownership.
    }

    function swapExactInputSingle(uint256 amountIn, address coinIn, address coinOut) payable public returns (uint256 amountOut) {

        TransferHelper.safeTransferFrom(coinIn, msg.sender, address(this), amountIn);

        // Approve the router to spend DAI.
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

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);

        emit swapsImplemented(msg.sender, amountIn, block.timestamp);
    }

    //uptil here is fine

    function executeProposal (address tokenAddress) public{
        //once the deadline for a proposal is finished, this function is called to see 
        //whether the proposal got acccepted or not
        if(proposals[tokenAddress].votesForYes>proposals[tokenAddress].votesForNo){
            if(number<4){
                //the number of crypto assets is still less than 5
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
                //to take care of the eth that is left idle, which we got from more members joining, since the last function call 
                uint256 toBuyAmount = (address(this).balance)/number;
                for(uint8 i=0; i<number; i++){
                    swapExactInputMatic(toBuyAmount, Portfolio[i].tokenAddress);//how to send native matic tokens
                }

            } else{
                //the number of crypto assets is 5
                // at any time we can only have 5 assets
                //when we want to add a new proposal, we remove the oldest crypto 
                //from our portfolio and simply replace the same funds for the new crypto
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
                    //dispensing of eth resting idle in this contract, can use chainlink keepers to do this as well...
                    swapExactInputMatic(toBuyAmount, Portfolio[i].tokenAddress);//how to send matic through this function call
                }
            }
        } else{
            delete proposals[tokenAddress];
        }
    }

    function swapExactInputMatic(uint256 amountIn, address tokenOut) payable public returns(uint256 amountOut){
        //since it is only used by this, instead of msg.value, how about taking it from matic balance of this smart contract  
        address payable WMATICaddress=payable(0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889);
        WMATIC wmat = WMATIC(WMATICaddress);
        wmat.deposit{value:amountIn}();
        // Approve the router to spend DAI.
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
//0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa == WETH
        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);

        emit swapsImplemented(msg.sender, amountIn, block.timestamp);
        //to test this
    }
    //1 more functions
    function liquidateOwnership(uint256 amountLiquidate) public {
        //function for a member to call when s/he wants to give up part or whole of his ownership
        uint256 balance_user = ERC20(address(this)).balanceOf(msg.sender);
        require(amountLiquidate <= balance_user, "more than u hv");
        uint256 total_balance = totalSupply();
        uint256 ratio = (balance_user/total_balance)*(amountLiquidate/balance_user);
        // if(amountLiquidate==balance_user){
        //     delete users[msg.sender];
        // }
        uint256 amountEth = (address(this).balance)*(ratio);
        payable(msg.sender).transfer(amountEth);
        uint8 i;
        uint256 balance;
        //give the part of the portfolio back, in the same tokens that were a part of the portfolio
        for(i=0; i<5; i++){
            balance = ERC20(Portfolio[i].tokenAddress).balanceOf(address(this));
            ERC20(Portfolio[i].tokenAddress).transfer(msg.sender, balance*ratio);
        }
        //burn the tokens for whose worth msg.sender, wants to liquidate his/her stake in this dao
        ERC20Burnable(address(this)).burnFrom(msg.sender, amountLiquidate);
        balances[msg.sender] -= amountLiquidate;
    }
}
