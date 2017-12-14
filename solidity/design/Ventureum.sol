// Ventureum project meta contract
Contract Ventureum is Ownable {

    // number of mVTH to cover 1 wei
    uint public exchangeRate;

    function setExchangeRate(uint _exchangeRate) {
        exchangeRate = _exchangeRate;
    }

    /**
     * @param value number of mVTH
     * @return number of wei covered
     */
    function mVTHToWei(uint value) returns (uint) {
        return value / exchangeRate;
    }
}
