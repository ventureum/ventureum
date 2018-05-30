pragma solidity^0.4.23;

library DLLBytes32 {
    struct Node {
        bytes32 next;
        bytes32 prev;
    }

    struct Data {
        mapping(bytes32 => Node) dll;
    }

    function getNext(Data storage self, bytes32 curr) public view returns (bytes32) {
        return self.dll[curr].next;
    }

    function getPrev(Data storage self, bytes32 curr) public view returns (bytes32) {
        return self.dll[curr].prev;
    }

    function insert(Data storage self, bytes32 prev, bytes32 curr, bytes32 next) public {
        self.dll[curr].prev = prev;
        self.dll[curr].next = next;

        self.dll[prev].next = curr;
        self.dll[next].prev = curr;
    }

    function remove(Data storage self, bytes32 curr) public {
        bytes32 next = getNext(self, curr);
        bytes32 prev = getPrev(self, curr);

        self.dll[next].prev = prev;
        self.dll[prev].next = next;

        self.dll[curr].next = curr;
        self.dll[curr].prev = curr;
    }
}
