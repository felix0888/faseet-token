const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FAssetToken", function () {
  let fAsset;
  let owner;
  let bob;
  let lucy;
  let ed;
  let blockNumber;

  beforeEach(async function() {
    FAsset = await ethers.getContractFactory("FAssetToken");
    [owner, bob, lucy, ed, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
    fAsset = await FAsset.deploy();
    blockNumber = await ethers.provider.getBlockNumber();
  });

  describe("deployment", function() {
    it("should set the owner of the contract", async function() {
      expect(await fAsset.owner()).to.equal(owner.address);
    });

    it("should update the total supply, balance and vote power of the owner", async function() {
      totalSupply = await fAsset.totalSupply();
      ownerBalance = await fAsset.balanceOfAt(owner.address, blockNumber);
      ownerVotePower = await fAsset.votePowerOfAt(owner.address, blockNumber);
      expect(ownerBalance).to.equal(totalSupply);
      expect(ownerVotePower).to.equal(totalSupply);
    });
  });

  describe("mint", function() {
    it("should update balance and vote power of the minter", async function() {
      await fAsset.connect(bob).mint(100);
      blockNumber++;
      balance = await fAsset.balanceOfAt(bob.address, blockNumber);
      votePower = await fAsset.votePowerOfAt(bob.address, blockNumber);
      expect(balance).to.equal(100);
      expect(votePower).to.equal(100);
    });
  });

  describe("transfer", function() {
    it("should update balance and vote power of the sender and receiver", async function() {
      await fAsset.connect(owner).transfer(bob.address, 100);
      blockNumber++;
      await fAsset.connect(bob).transfer(lucy.address, 20);
      blockNumber++;

      balanceBob = await fAsset.balanceOfAt(bob.address, blockNumber);
      votePowerBob = await fAsset.votePowerOfAt(bob.address, blockNumber);
      balanceLucy = await fAsset.balanceOfAt(lucy.address, blockNumber);
      votePowerLucy = await fAsset.votePowerOfAt(lucy.address, blockNumber);
      expect(balanceBob).to.equal(80);
      expect(votePowerBob).to.equal(80);
      expect(balanceLucy).to.equal(20);
      expect(votePowerLucy).to.equal(20);
    });
  });

  describe("delegate", function() {
    context("with invalid address", function() {
      it("should be reverted with proper error message", async function() {
        await expect(
          fAsset.connect(bob).delegate(bob.address, 10)
        ).to.be.revertedWith("FAsset: invalid delegation address.");
      });
    });

    context("with delegator behind 5th", function() {
      it("should be reverted with proper error message", async function() {
        await fAsset.connect(bob).delegate(lucy.address, 10);
        await fAsset.connect(bob).delegate(ed.address, 10);
        await fAsset.connect(bob).delegate(addr1.address, 10);
        await fAsset.connect(bob).delegate(addr2.address, 10);
        await fAsset.connect(bob).delegate(addr3.address, 10);

        await expect(
          fAsset.connect(bob).delegate(addr4.address, 10)
        ).to.be.revertedWith("FAsset: maximum delegators.");
      });
    });

    context("with invalid delegation percentage", function() {
      it("should be reverted for delegation percentage greater than 100", async function() {
        await expect(
          fAsset.connect(bob).delegate(lucy.address, 101)
        ).to.be.revertedWith("FAsset: invalid delegation amount.");
      });

      it("should be reverted when delegation percentage is greater than the remaining", async function() {
        await fAsset.connect(bob).delegate(lucy.address, 60);
        await expect(
          fAsset.connect(bob).delegate(ed.address, 50)
        ).to.be.revertedWith("FAsset: insufficient percentage to delegate.");
      });
    })

    context("with valid address and delegation percentage", function() {
      it("should update the vote powers, but not their balances", async function() {
        await fAsset.connect(owner).transfer(bob.address, 200);
        blockNumber++;
        await fAsset.connect(bob).delegate(lucy.address, 20);
        blockNumber++;

        balanceBob = await fAsset.balanceOfAt(bob.address, blockNumber);
        votePowerBob = await fAsset.votePowerOfAt(bob.address, blockNumber);
        balanceLucy = await fAsset.balanceOfAt(lucy.address, blockNumber);
        votePowerLucy = await fAsset.votePowerOfAt(lucy.address, blockNumber);
        expect(balanceBob).to.equal(200);
        expect(votePowerBob).to.equal(160);
        expect(balanceLucy).to.equal(0);
        expect(votePowerLucy).to.equal(40);
      });
    });
  });

  describe("special test scenarios", function() {
    context("with test scenario #1", function() {

    });

    context("with test scenario #2", function() {
      
    });
  });
});
