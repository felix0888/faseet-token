# FAseet Token
FAsset - Token Contract that supports ERC20 and some extra functionality

## Purpose
To create a token contract that supports ERC20 plus some extra functionality. The token contract is able to return balance / vote power of an adddress in a specific block and delegate the vote power.

## Implementation Detail
Wite a token contract that supports a few addtional API's on the top of normal ERC20. Required functions are: balanceOfAt, votePowerOfAt, delegate.
Can take miniMe token as reference.

### Functions
#### balanceOfAt(address, block)
To return the balance of an address in a specific block in the past.

#### votePowerOfAt(address, block)
To return the vote power of an address at a specific block in the past. The vote power should include its own balance and any blance delegated to it by other addresses in this block.

#### delegate(address, percentage)
To enable each token holder to delegate a percentage(or all) of his vote power(balance) to 1~5 other addresses. Delegation unites are percentage. Max 100% of vote power can be delegated. 1 level delegation should be supported.

### How it works?
The token contract should use calls to APIs transfer and delegate to update vote power of relevant addresses involved. Example:

```
- Block 5: Bob has 20 tokens, 20 vote power and Lucy has 10 tokens, 10 vote power and Ed has no tokens, no vote power.
  votePowerOfAt(Bob, 9) = 20
  votePowerOfAt(lucy, 9) = 10
  votePowerOfAt(Ed, 9) = 0

- Block 10: Bob delegates 50% of voting power to Lucy and 25% to Ed. now Ed has vote Power 5, Lucy has vote power 20, Bob has vote power 5.
  votePowerOfAt(Bob, 11) = 5
  votePowerOfAt(Lucy, 11) = 20
  votePowerOfAt(Ed, 11) = 5

- Block 12: Bob receives 16 tokens.
  votePowerOfAt(Bob, 13) = 9
  votePowerOfAt(Lucy, 13) = 28
  votePowerOfAt(Ed, 13) = 9

- Block 15: Lucy delegates 100% of vote power to Ed(demonstrate 1 level delegtion)
  votePowerOfAt(lucy, 16) = 9
  votePowerOfAt(lucy, 16) = 18
  votePowerOfAt(Ed, 16) = 19
```

For removing delegated vote power, one should call delegate(address, percentage) with percentage = 0.

## Requirements
- Calling votePowerAt complexity should be Max O(log n)
- Calling getDelegationToAt complexitiy should be Max O(log n)
- Any address can never delegate more than 100%
- Write a few tests to make sure that the code does what is expected
- Follow solidity style as outlinked here: https://docs.soliditylang.org/en/v0.7.6/layout-of-source-files.html
- Clean readable and linted code is expected.
- Rounding down should not leave out any un-delegated tokens, i.e. if total delegated percentage sums up to 100%, delegated vote power shouls also sum up to 100%.

#### Notes
- Can refer compunds token for inspiration. And minime token for implementing balance in previous blocks - blockOfAt.
- Have to update vote power data per call to transfer and delegate.

#### Test Scenarios
- Basic functionality should be tested with a dedicated truffle / hardhat test for each aspect mentioned above.
- Have to pass this test scenario:

```
1. Bob balance: 10, delegate none
Lucy balance: 0
2. validate: votePower for bob: 10
validate votepower for lucy: 0
3. Bob delegates 50% to lucy
validate votePower of lucy: 5
4. bob receives 10 tokens
validate vote power of lucy: 10
```

## Deploy & Test
#### Installation
````
npm install
npx hardhat node
````
#### Deploy
```
npx hardhat run --network [NETWORK-NAME] scripts/deploy.js
```
#### Run the test scripts
```
npx hardhat test
```
