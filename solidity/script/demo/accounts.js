export function getDemoAccounts (web3) {
  const accounts = [
    "0xa9B0cF09F88B95cE9596524bD15147f8664B85bF",
    "0x12088237BE120f6516287a74fC01B60935B1cf89",
    "0x99C871D2A36B6965230B6c0ecd259a28da2809E0",
    "0x41284Ee87fEd1013ea313cAa435Ff0fbEE887DBF",
    "0xE23ABfC1f558Aa08Cfe664af63C3A214D1F95290",
    "0x7983D0e92dDF62719c44b34AAdBf9F8156f97Ece"
  ]

  class Accounts {}

  /*
   * TODO (@b232wang)
   * Use web3 accounts first, demo may need real address to test.
   *
   */
  Accounts.ROOT = accounts[0]
  Accounts.PROJECT_OWNER = accounts[1]
  Accounts.CHALLENGER = accounts[2]
  Accounts.VOTER1 = accounts[3]
  Accounts.VOTER2 = accounts[4]

  Accounts.PURCHASER1 = accounts[2]
  Accounts.PURCHASER2 = accounts[3]
  Accounts.PURCHASER3 = accounts[4]

  Accounts.INVESTOR1 = accounts[2]
  Accounts.INVESTOR2 = accounts[3]
  Accounts.REGULATOR1 = accounts[5]
  Accounts.REGULATOR2 = accounts[6]

  Accounts.PROJECT_OWNER = "0x12088237be120f6516287a74fc01b60935b1cf89"
  Accounts.BENEFICIARY = "0x12088237be120f6516287a74fc01b60935b1cf89"
  return Accounts
}
