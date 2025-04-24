// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EtherStaking is Ownable {
    IERC20 public fitechToken;
    uint256 public rewardRate = 10; // 10 tokens rewarded per ETH per staking period
    uint256 public stakingPeriod = 30 days;

    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Stake) public stakes;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 reward);

    constructor(address _fitechToken, address initialOwner) Ownable(initialOwner) {
        fitechToken = IERC20(_fitechToken);
    }

    function stake() external payable {
        require(msg.value > 0, "Must stake some ETH");
        require(stakes[msg.sender].amount == 0, "Already staking");

        stakes[msg.sender] = Stake(msg.value, block.timestamp);
        emit Staked(msg.sender, msg.value, block.timestamp);
    }

    function withdraw() external {
        Stake memory userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No stake found");
        require(block.timestamp >= userStake.timestamp + stakingPeriod, "Staking period not over");

        uint256 reward = calculateReward(userStake.amount, userStake.timestamp);
        rewards[msg.sender] += reward;

        uint256 stakedAmount = userStake.amount;
        delete stakes[msg.sender];

        // Transfer ETH back
        (bool sent, ) = msg.sender.call{value: stakedAmount}("");
        require(sent, "Failed to send ETH");

        // Transfer Fitech tokens
        require(fitechToken.transfer(msg.sender, reward), "Token transfer failed");

        emit Withdrawn(msg.sender, stakedAmount, reward);
    }

    function calculateReward(uint256 amount, uint256 startTime) public view returns (uint256) {
        uint256 periods = (block.timestamp - startTime) / stakingPeriod;
        return (amount * rewardRate * periods) / 1 ether;
    }

    function depositRewardTokens(uint256 amount) external onlyOwner {
        require(fitechToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
    }

    receive() external payable {}
}
