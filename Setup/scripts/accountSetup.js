const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
  AccountBalanceQuery,
  AccountId
} = require('@hashgraph/sdk');
//const { default: CostQuery } = require('@hashgraph/sdk/lib/query/CostQuery');
require('dotenv').config();

const { NO_OF_ACCOUNTS, CLIENT_ID, CLIENT_PRIVATE_KEY } = process.env;

const main = async () => {
  //Create new keys
  console.log(`\nGenerating Key Pairs`);
  const keyPairs = await generateKeys(NO_OF_ACCOUNTS);

  console.log(`\nAdding initial balance to accounts`);
  const generatedAccounts = await createAccounts(keyPairs);

  console.log(`\nGetting funded account IDs`);
  const accountIds = await getAccountIds(generatedAccounts);

  console.log(`\nCreated 5 accounts with 1000 HBAR. Accounts are:`);

  const accountIdsCreated = [];
  // Get the new account ID
  accountIds.map(async (receipt, i) => {
    console.log(`\n\nAccount ${i + 1} ID: ${receipt.accountId.toString()}`);
    accountIdsCreated.push(receipt.accountId.toString());
  });
 
  accountIdsCreated.forEach(async (account, index) => {
    console.log(`\n\nAccount ${index + 1} ID: ${account.toString()}`);
    console.log(`Public Key: ${keyPairs.publicKeys[index].toStringRaw()}`);
    console.log(`Private Key: ${keyPairs.privateKeys[index].toStringRaw()}`);
    await queryBalance(account);
  
  });
  process.exit();
};

const getClient = async () => {
  // If we weren't able to grab it, we should throw a new error
  if (CLIENT_ID == null || CLIENT_PRIVATE_KEY == null) {
    throw new Error(
      'Environment variables CLIENT_ID and CLIENT_PRIVATE_KEY must be present'
    );
  }

  // Create our connection to the Hedera network
  return Client.forTestnet().setOperator(CLIENT_ID, CLIENT_PRIVATE_KEY);
};

const generateKeys = async (numOfKeys) => {
  const privateKeys = [];
  const publicKeys = [];

  for (let i = 0; i < numOfKeys; i++) {
    const privateKey1 = PrivateKey.generateED25519();
    const publicKey1 = privateKey1.publicKey;
    privateKeys.push(privateKey1);
    publicKeys.push(publicKey1);
  }

  return { privateKeys, publicKeys };
};

const createAccounts = async (keyPairs) => {
  const client = await getClient();

  const promises = [];
  for (let i = 0; i < keyPairs.publicKeys.length; i++) {
    promises.push(
      new AccountCreateTransaction()
        .setKey(keyPairs.publicKeys[i])
        .setInitialBalance(Hbar.fromString('100'))
        .execute(client)
    );
  }
  return Promise.all(promises);
};

const getAccountIds = async (accCreateTxns) => {
  const client = await getClient();

  const promises = [];
  for (let i = 0; i < accCreateTxns.length; i++) {
    promises.push(accCreateTxns[i].getReceipt(client));
  }
  return Promise.all(promises);
};

const queryBalance = async (accountId) => {

  const client = await getClient();

  //Create the query
  const balanceQuery = new AccountBalanceQuery().setAccountId(accountId);

  //Sign with the client operator private key and submit to a Hedera network
  const tokenBalance = await balanceQuery.execute(client);

  console.log(`- Balance of account ${accountId}: ${tokenBalance.hbars.toString()} `);

};

main();
