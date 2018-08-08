export function getDemoAccounts (web3) {
  const accounts = web3.eth.accounts

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

  return Accounts
}
