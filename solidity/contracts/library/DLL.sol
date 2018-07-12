pragma solidity^0.4.24;

import "@ventureum/conversion/contracts/Conversion.sol";


library DLL {
    struct Node {
        uint next;
        uint prev;
        bool exist;
    }

    struct Data {
        mapping(uint => Node) dll;
    }

    function getNext(Data storage self, uint curr) public view returns (uint) {
        uint next = self.dll[Conversion.storageConversion(curr)].next;
        if (next == 0) {
            return 0;
        }
        return Conversion.takeOutConversion(next);
    }

    function getPrev(Data storage self, uint curr) public view returns (uint) {
        uint prev = self.dll[Conversion.storageConversion(curr)].prev;
        if (prev == 0) {
            return 0;
        }
        return Conversion.takeOutConversion(prev);
    }

    function insert(Data storage self, uint prev, uint curr, uint next) public {
        require(curr > 0);

        prev = Conversion.storageConversion(prev);
        curr = Conversion.storageConversion(curr);
        next = Conversion.storageConversion(next);

        require(!self.dll[curr].exist);

        self.dll[curr].prev = prev;
        self.dll[curr].next = next;

        self.dll[prev].next = curr;
        self.dll[next].prev = curr;

        self.dll[curr].exist = true;
    }

    function remove(Data storage self, uint curr) public {
        require(curr > 0);

        curr = Conversion.storageConversion(curr);

        require(self.dll[curr].exist);

        uint next = self.dll[curr].next;
        uint prev = self.dll[curr].prev;

        self.dll[next].prev = prev;
        self.dll[prev].next = next;

        self.dll[curr].next = curr;
        self.dll[curr].prev = curr;

        self.dll[curr].exist = false;
    }
}
