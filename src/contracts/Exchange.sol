pragma solidity ^0.5.16;

import "./Token.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

//Deposit and withdraw funds
//Manage orders - Make or Cancel
//Handle Trades - Charge fees

//TODO
//[x] Set ther fee account
//[x] Deposit Ether
//[x] Withdraw Ether
//[x] Deposit Tokens
//[x] Withdraw tokens
//[x] Check balances
//[x] Make order
//[x] Cancel order
//[ ] Fill order
//[ ] Charge fees

contract Exchange {
    using SafeMath for uint;

    //Variables
    address public feeAccount; //The account that recieves exchange fees
    uint public feePercent; //The fee percentage
    address constant ETHER = address(0); //Allows the storage of ETH in tokens mapping with blank address
    mapping(address => mapping(address => uint)) public tokens;
    //a way to store the order
    mapping(uint => _Order) public orders;
    uint public orderCount;
    //canceled orders mapping
    mapping(uint => bool) public orderCancelled;
    //Filling order mapping
    mapping(uint => bool) public orderFilled;

    //Event
    event Deposit(address token, address user, uint amount, uint balance);
    event Withdraw(address token, address user, uint amount, uint balance);
    event Order(
        uint id,
        address user,
        address tokenGet,
        uint amountGet,
        address tokenGive,
        uint amountGive,
        uint timestamp
    );

    event Cancel(
        uint id,
        address user,
        address tokenGet,
        uint amountGet,
        address tokenGive,
        uint amountGive,
        uint timestamp
    );

    event Trade(
        uint id,
        address user,
        address tokenGet,
        uint amountGet,
        address tokenGive,
        uint amountGive,
        address userFill,
        uint timestamp
    );

    //a way to model the order
    struct _Order {
        uint id;
        address user;
        address tokenGet;
        uint amountGet;
        address tokenGive;
        uint amountGive;
        uint timestamp;
    }

    constructor (address _feeAccount, uint _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    //Fallback; reverts if ETH is trasfered to the smart contract by mistake
    function () external {
        revert();
    }

    function depositEther() payable public {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint _amount) public {
        require(tokens[ETHER][msg.sender] >= _amount);
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        msg.sender.transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }
                          //Which Token???  //How much???
    function depositToken(address _token, uint _amount) public {
        //TODO: Don't allow the deposit of ETHER
        require(_token != ETHER);
       //Send Tokens to contract
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
       //Manage deposit
       tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
       //Emit Event
       emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint _amount) public {
       require(_token != ETHER);
       require(tokens[_token][msg.sender] >= _amount);
       tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
       require(Token(_token).transfer(msg.sender, _amount));
       emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns (uint) {
        return tokens[_token][_user];
    }

    //add the order to storage
    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint _amountGive) public {
	    orderCount = orderCount.add(1);
	    orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
        emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
    }

    function cancelOrder(uint _id) public {
	    //Must be "my" order
	    _Order storage _order = orders[_id];
	    //Must be valid order	
	    require(address(_order.user) == msg.sender);
	    require(_order.id == _id); // order must exist
	    orderCancelled[_id] = true;
	    emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, now);	
    }

    function fillOrder(uint _id) public {
        require(_id > 0 && _id <= orderCount);
        require(!orderFilled[_id]);
        require(!orderCancelled[_id]);
        
        //Fetch the order
        _Order storage _order = orders[_id];
        _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);

        //Mark order as filled
        orderFilled[_order.id] = true;
    }

    function _trade(uint _orderId, address _user, address _tokenGet, uint _amountGet, address _tokenGive, uint _amountGive) internal {
        //Fee paid by the user that fills the order, a.k.a msg.sender
        //Fee deducted from _amountGet
        uint _feeAmount = _amountGet.mul(feePercent).div(100);
        //Execute trade
        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount));
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);
        //Collects fees
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount);
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);
        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGet);
        //Charge fees
        //Emit trade event
        emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, now);
    }

}

