import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FitechToken, EtherStaking } from "../typechain-types";

describe("EtherStaking", function () {
  let fitechToken: FitechToken;
  let etherStaking: EtherStaking;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy FitechToken
    const FitechTokenFactory = await ethers.getContractFactory("FitechToken");
    fitechToken = await FitechTokenFactory.deploy(owner.address);
    await fitechToken.waitForDeployment();

    // Deploy EtherStaking
    const EtherStakingFactory = await ethers.getContractFactory("EtherStaking");
    etherStaking = await EtherStakingFactory.deploy(fitechToken.target, owner.address);
    await etherStaking.waitForDeployment();

    // Approve and deposit reward tokens
    await fitechToken.mint(owner.address, ethers.parseUnits("10000", 18));
    await fitechToken.approve(etherStaking.target, ethers.parseUnits("10000", 18));
    await etherStaking.depositRewardTokens(ethers.parseUnits("10000", 18));
  });

  it("Should allow staking ETH", async function () {
    await etherStaking.connect(user1).stake({ value: ethers.parseEther("1") });
    const stake = await etherStaking.stakes(user1.address);
    expect(stake.amount).to.equal(ethers.parseEther("1"));
    expect(stake.timestamp).to.be.above(0);
  });

  it("Should not allow staking if already staked", async function () {
    await etherStaking.connect(user1).stake({ value: ethers.parseEther("1") });
    await expect(
      etherStaking.connect(user1).stake({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("Already staking");
  });

  it("Should allow withdrawal and reward after staking period", async function () {
    await etherStaking.connect(user1).stake({ value: ethers.parseEther("1") });

    // Fast-forward time
    await time.increase(30 * 24 * 60 * 60); // 30 days

    const initialBalance = await ethers.provider.getBalance(user1.address);
    const initialTokenBalance = await fitechToken.balanceOf(user1.address);

    await etherStaking.connect(user1).withdraw();

    const finalBalance = await ethers.provider.getBalance(user1.address);
    const finalTokenBalance = await fitechToken.balanceOf(user1.address);

    expect(finalBalance).to.be.above(initialBalance);
    expect(finalTokenBalance).to.equal(ethers.parseUnits("10", 18)); // 1 ETH * 10 tokens
  });

  it("Should not allow withdrawal before staking period", async function () {
    await etherStaking.connect(user1).stake({ value: ethers.parseEther("1") });
    await expect(etherStaking.connect(user1).withdraw()).to.be.revertedWith(
      "Staking period not over"
    );
  });

  it("Should calculate rewards correctly", async function () {
    await etherStaking.connect(user1).stake({ value: ethers.parseEther("1") });
    await time.increase(60 * 24 * 60 * 60); // 60 days
    const reward = await etherStaking.calculateReward(
      ethers.parseEther("1"),
      (await etherStaking.stakes(user1.address)).timestamp
    );
    expect(reward).to.equal(ethers.parseUnits("20", 18)); // 2 periods * 10 tokens
  });

  it("Should allow minting FitechToken by owner", async function () {
    await fitechToken.mint(user1.address, ethers.parseUnits("100", 18));
    expect(await fitechToken.balanceOf(user1.address)).to.equal(ethers.parseUnits("100", 18));
  });
});