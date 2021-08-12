//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "hardhat/console.sol";


contract FAssetToken is ERC20("FAsset", "FAT"), Ownable {
    using SafeMath for uint8;
    using SafeMath for uint128;
    using SafeMath for uint256;

    struct CheckPoint {
        uint128 fromBlock;
        uint128 value;
    }

    struct Delegation {
        uint8 percentageRemaining;
        address[] delegators;
        mapping(address => uint8) delegationPercentage;
    }

    uint256 public constant INITIAL_SUPPLY = 1000000;

    mapping(address => CheckPoint[]) public balances;
    mapping(address => CheckPoint[]) public votePowers;
    mapping(address => Delegation) private delegations;

    constructor() public {
        _setupDecimals(0);
        _mint(_msgSender(), INITIAL_SUPPLY);

        updateBalanceAndVotePower(_msgSender(), INITIAL_SUPPLY, true);
    }

    function mint(uint256 _amount) external {
        _mint(_msgSender(), _amount);
        updateBalanceAndVotePower(_msgSender(), _amount, true);
    }

    function transfer(address _recipient, uint256 _amount) public override returns (bool) {
        _transfer(_msgSender(), _recipient, _amount);
        updateBalanceAndVotePower(_msgSender(), _amount, false);
        updateBalanceAndVotePower(_recipient, _amount, true);
        return true;
    }

    function delegate(address _delegator, uint8 _percentage) external {
        require(_msgSender() != _delegator, "FAsset: invalid delegation address.");
        require(_percentage >= 0 && _percentage <= 100, "FAsset: invalid delegation amount.");
        Delegation storage delegation = delegations[_msgSender()];
        address[] storage delegators = delegation.delegators;
        uint256 delegatorsLen = delegators.length;
        uint256 blockNumber = block.number;
        uint256 votePower;
        uint256 i;
        for (i = 0; i < delegatorsLen; i++) {
            if (delegators[i] == _delegator) {
                if (_percentage == 0) {
                    delegation.percentageRemaining = uint8(delegation.percentageRemaining.add(delegation.delegationPercentage[_delegator]));
                    votePower = balanceOfAt(_msgSender(), blockNumber).mul(delegation.delegationPercentage[_delegator]).div(100);
                    updateVotePower(_msgSender(), votePower, true);
                    updateVotePower(_delegator, votePower, false);
                    delete delegators[i];
                    delete delegation.delegationPercentage[_delegator];
                } else {
                    require(delegation.percentageRemaining >= _percentage, "FAsset: insufficient percentage to delegate.");
                    delegation.percentageRemaining = uint8(delegation.percentageRemaining.sub(_percentage));
                    delegation.delegationPercentage[_delegator] = uint8(delegation.delegationPercentage[_delegator].add(_percentage));
                    votePower = balanceOfAt(msg.sender, blockNumber).mul(_percentage).div(100);
                    updateVotePower(_msgSender(), votePower, false);
                    updateVotePower(_delegator, votePower, true);
                }
                return;
            }
        }
        require(delegatorsLen < 5, "FAsset: maximum delegators.");
        if (delegatorsLen == 0)
            delegation.percentageRemaining = 100;
        require(delegation.percentageRemaining >= _percentage, "FAsset: insufficient percentage to delegate.");
        delegators.push(_delegator);
        delegation.percentageRemaining = uint8(delegation.percentageRemaining.sub(_percentage));
        delegation.delegationPercentage[_delegator] = _percentage;
        votePower = balanceOfAt(_msgSender(), blockNumber).mul(uint8(_percentage)).div(100);
        updateVotePower(_msgSender(), votePower, false);
        updateVotePower(_delegator, votePower, true);
    }

    function balanceOfAt(address _owner, uint256 _blockNumber) public view returns (uint256) {
        return valueAt(balances[_owner], _blockNumber);
    }

    function votePowerOfAt(address _owner, uint256 _blockNumber) public view returns (uint256) {
        return valueAt(votePowers[_owner], _blockNumber);
    }

    function updateBalanceAndVotePower(address _owner, uint256 _amountChange, bool _isAdd) private {
        updateBalance(_owner, _amountChange, _isAdd);
        updateVotePowers(_owner, _amountChange, _isAdd);
    }

    function updateBalance(address _owner, uint256 _amountChange, bool _isAdd) private {
        uint256 balance = balanceOfAt(_owner, block.number);
        balance = _isAdd ? balance.add(_amountChange) : balance.sub(_amountChange);
        updateValue(balances[_owner], balance);
    }

    function updateVotePowers(address _owner, uint256 _amountChange, bool _isAdd) private {
        Delegation storage delegationFrom = delegations[_owner];
        address[] storage delegators = delegationFrom.delegators;
        uint256 delegatorsLen = delegators.length;
        if (delegatorsLen == 0)
            delegationFrom.percentageRemaining = 100;
        updateVotePower(_owner, _amountChange.mul(uint256(delegationFrom.percentageRemaining)).div(100), _isAdd);
        for (uint256 i = 0; i < delegatorsLen; i++) {
            updateVotePower(delegators[i], _amountChange.mul(delegationFrom.delegationPercentage[delegators[i]]).div(100), _isAdd);
        }
    }

    function updateVotePower(address _owner, uint256 _amountChange, bool _isAdd) private {
        uint256 votePower = votePowerOfAt(_owner, block.number);
        votePower = _isAdd ? votePower.add(_amountChange) : votePower.sub(_amountChange);
        updateValue(votePowers[_owner], votePower);
    }

    function updateValue(CheckPoint[] storage _checkPoints, uint256 _value) private {
        uint256 checkPointsLen = _checkPoints.length;
        if (checkPointsLen == 0 || _checkPoints[checkPointsLen - 1].fromBlock < block.number) {
            CheckPoint memory newCheckPoint;
            newCheckPoint.fromBlock = uint128(block.number);
            newCheckPoint.value = uint128(_value);
            _checkPoints.push(newCheckPoint);
        } else {
            CheckPoint storage checkPoint = _checkPoints[checkPointsLen - 1];
            checkPoint.value = uint128(_value);
        }
    }

    function valueAt(CheckPoint[] storage _checkPoints, uint256 _blockNumber) private view returns (uint256) {
        uint256 checkPointsLen = _checkPoints.length;
        if (checkPointsLen == 0) return 0;
        if (_blockNumber >= _checkPoints[checkPointsLen - 1].fromBlock)
            return _checkPoints[checkPointsLen - 1].value;

        uint256 min = 0;
        uint256 max = checkPointsLen - 1;
        uint256 mid;
        while (min != max) {
            mid = (min.add(max)).div(2);
            if (_checkPoints[mid].fromBlock >= _blockNumber) {
                min = mid;
            } else {
                max = mid - 1;
            }
        }
        return _checkPoints[min].value;
    }
}
