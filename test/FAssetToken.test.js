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
      expect(await fAsset.balanceOfAt(owner.address, blockNumber)).to.equal(totalSupply);
      expect(await fAsset.votePowerOfAt(owner.address, blockNumber)).to.equal(totalSupply);
    });
  });

  describe("mint", function() {
    it("should update balance and vote power of the minter", async function() {
      await fAsset.connect(bob).mint(100);
      blockNumber++;
      expect(await fAsset.balanceOfAt(bob.address, blockNumber)).to.equal(100);
      expect(await fAsset.votePowerOfAt(bob.address, blockNumber)).to.equal(100);
    });
  });

  describe("transfer", function() {
    it("should update balance and vote power of the sender and receiver", async function() {
      await fAsset.connect(owner).transfer(bob.address, 100);
      blockNumber++;
      await fAsset.connect(bob).transfer(lucy.address, 20);
      blockNumber++;

      expect(await fAsset.balanceOfAt(bob.address, blockNumber)).to.equal(80);
      expect(await fAsset.votePowerOfAt(bob.address, blockNumber)).to.equal(80);
      expect(await fAsset.balanceOfAt(lucy.address, blockNumber)).to.equal(20);
      expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(20);
    });
  });

  describe("delegate", function() {
    context("with invalid delegator", function() {
      it("should be reverted for delegator same with owner", async function() {
        await expect(
          fAsset.connect(bob).delegate(bob.address, 10)
        ).to.be.revertedWith("FAsset: invalid delegation address.");
      });

      it("should be reverted for the delegator behind 5th", async function() {
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

      it("should be reverted with delegation percentage greater than remaining", async function() {
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

        expect(await fAsset.balanceOfAt(bob.address, blockNumber)).to.equal(200);
        expect(await fAsset.votePowerOfAt(bob.address, blockNumber)).to.equal(160);
        expect(await fAsset.balanceOfAt(lucy.address, blockNumber)).to.equal(0);
        expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(40);
      });
    });
  });

  describe("special test scenarios", function() {
    context("with test scenario #1", function() {
      it("should retrieve correct vote power values of an address at block", async function() {
        // Bob has 20 tokens: vote power 20, Lucy has 10 tokens: vote power 10, Ed has no tokens: vote power 0.
        // votePowerOfAt(bob, 9) -> 20
        // votePowerOfAt(lucy, 9) -> 10
        // votePowerOfAt(ed, 9) -> 0
        await fAsset.connect(owner).transfer(bob.address, 20);
        blockNumber++;
        await fAsset.connect(owner).transfer(lucy.address, 10);
        blockNumber++;
        expect(await fAsset.votePowerOfAt(bob.address, blockNumber)).to.equal(20);
        expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(10);
        expect(await fAsset.votePowerOfAt(ed.address, blockNumber)).to.equal(0);
        // Bob delegates 50% of voting power to Lucy and 25% to Ed.
        // Now Bob has vote power 5, Lucy has vote power 20, Ed has vote power 5
        // votePowerOfAt(bob, 9) -> 20
        // votePowerOfAt(lucy, 9) -> 5
        // votePowerOfAt(ed, 9) -> 0
        blockNumber++;
        await fAsset.connect(bob).delegate(lucy.address, 50);
        blockNumber++;
        await fAsset.connect(bob).delegate(ed.address, 25);
        blockNumber++;
        expect(await fAsset.votePowerOfAt(bob.address, blockNumber)).to.equal(5);
        expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(20);
        expect(await fAsset.votePowerOfAt(ed.address, blockNumber)).to.equal(5);
        // Bob receives 16 tokens
        // votePowerOfAt(Bob, 13) -> 9
        // votePowerOfAt(Lucy, 13) -> 28
        // votePowerOfAt(Ed, 13) -> 9
        blockNumber++;
        await fAsset.connect(owner).transfer(bob.address, 16);
        blockNumber++;
        expect(await fAsset.votePowerOfAt(bob.address, blockNumber)).to.equal(9);
        expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(28);
        expect(await fAsset.votePowerOfAt(ed.address, blockNumber)).to.equal(9);
        // Lucy delegates 100% of vote power to Ed (demonstrage 1 level delegation)
        // votePowerOfAt(Bob, 16) -> 9
        // votePowerOfAt(Lucy, 16) -> 18
        // votePowerOfAt(Ed, 16) -> 19
        blockNumber++;
        await fAsset.connect(lucy).delegate(ed.address, 100);
        blockNumber++;
        expect(await fAsset.votePowerOfAt(bob.address, blockNumber)).to.equal(9);
        expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(18);
        expect(await fAsset.votePowerOfAt(ed.address, blockNumber)).to.equal(19);
      });
    });

    context("with test scenario #2", async function() {
      it("should retrieve correct vote power values of an address at block", async function() {
        // Bob balance: 10, delegate none, Lucy balance: 0
        await fAsset.connect(owner).transfer(bob.address, 10);
        // validate: votePower for Bob: 10
        // validate: votePower for Lucy: 0
        blockNumber++;
        expect(await fAsset.votePowerOfAt(bob.address, blockNumber)).to.equal(10);
        expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(0);
        // Bob delegates 50% to Lucy
        blockNumber++;
        await fAsset.connect(bob).delegate(lucy.address, 50);
        // validate votePower of Lucy: 5
        blockNumber++;
        expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(5);
        // Bob receives 10 tokens
        blockNumber++;
        await fAsset.connect(owner).transfer(bob.address, 10);
        // validate vote power of lucy: 10
        blockNumber++;
        expect(await fAsset.votePowerOfAt(lucy.address, blockNumber)).to.equal(10);
      });
    });
  });
});
