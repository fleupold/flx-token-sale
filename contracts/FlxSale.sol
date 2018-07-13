pragma solidity ^0.4.24;

import "@gnosis.pm/util-contracts/contracts/StandardToken.sol";
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import "canonical-weth/contracts/WETH9.sol";

contract FlxSale is StandardToken, Ownable {
  string public constant name = "FLX Token";
  string public constant symbol = "FLX";
  uint8 public constant decimals = 18;

  event Pledged(address indexed from, uint amount, uint pledgedTotal);
  event Claimed(address indexed from, uint amount, uint totalClaimed);

  mapping (address => uint) public pledgers;
  Stage public stage = Stage.Funding;
  uint public pledgedTotal;
  uint fundingCompleted;

  WETH9 wethContract;

  constructor(address wethAddress) public {
    wethContract = WETH9(wethAddress);
  }

  function pledge(uint amount) external atStage(Stage.Funding) {
    require(
      wethContract.transferFrom(msg.sender, this, amount),
      "Not enough WETH approved");
    require(
      pledgedTotal + amount <= 1000,
      "Pledge would exceed maximum amount of tokens available");
    pledgers[msg.sender] += amount;
    pledgedTotal += amount;
    emit Pledged(msg.sender, amount, pledgedTotal);

    if (pledgedTotal >= 1000) {
      stage = Stage.Claimable;
      fundingCompleted = now;
    }
  }

  function claim() external atStage(Stage.Claimable) {
    require (now > fundingCompleted + 2 minutes);

    uint claimAmount = pledgers[msg.sender] * 10;
    pledgers[msg.sender] = 0;
    totalTokens += claimAmount;
    balances[msg.sender] += claimAmount;

    emit Claimed(msg.sender, claimAmount, totalTokens);
  }

  function drainFunds() external onlyOwner() {
    wethContract.transfer(owner, wethContract.balanceOf(this));
  }

  modifier atStage(Stage targetStage) {
    require(stage == targetStage, "Function cannot be called at this time.");
    _;
  }

  enum Stage {
    Funding,
    Claimable
  }

}
