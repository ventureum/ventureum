pragma solidity ^0.4.23;

interface IBearMarketIndicator {
    /**
     * Bear market indicator
     *
     * @return boolea indicating whether we are in
     * a bear market
     */
    function isBearMarket() public view returns (bool);
}
