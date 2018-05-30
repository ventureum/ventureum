pragma solidity^0.4.23;


library AttributeStore {
    struct Data {
        mapping(bytes32 => uint) store;
    }

    function getAttribute(Data storage self, bytes32 UUID, string attrName) public view returns (uint) {
        bytes32 key = keccak256(UUID, attrName);
        return self.store[key];
    }

    function attachAttribute(Data storage self, bytes32 UUID, string attrName, uint attrVal) public {
        bytes32 key = keccak256(UUID, attrName);
        self.store[key] = attrVal;
    }
}
