const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  Hbar,
  KeyList,
  ScheduleInfoQuery,
  TransactionRecordQuery,
  ScheduleSignTransaction
} = require('@hashgraph/sdk');
require('dotenv').config();

//Grab your Hedera testnet account ID and private key from your .env file
const {
  CLIENT_ID,
  CLIENT_PRIVATE_KEY,
  ACCOUNT_1_PRIVATE_KEY,
  ACCOUNT_2_PRIVATE_KEY,
  ACCOUNT_3_PRIVATE_KEY,
  ACCOUNT_4_PRIVATE_KEY,
  ACCOUNT_5_PRIVATE_KEY,
  ACCOUNT_4_ID,
} = process.env;

const main = async () => {
  const client = await getClient();

  //Creating key objects and extracting public keys
  const key1 = PrivateKey.fromString(ACCOUNT_1_PRIVATE_KEY).publicKey;
  const key2 = PrivateKey.fromString(ACCOUNT_2_PRIVATE_KEY).publicKey;
  const key3 = PrivateKey.fromString(ACCOUNT_3_PRIVATE_KEY).publicKey;
  const key4 = PrivateKey.fromString(ACCOUNT_3_PRIVATE_KEY).publicKey;
  const key5 = PrivateKey.fromString(ACCOUNT_3_PRIVATE_KEY).publicKey;

  //Creating array of multi sig account owners
  const keys = [key1, key2, key3, key4, key5];

  //Create a key list with 3 keys and require 2 signatures
  const keyList = new KeyList(keys, 3);

  //Create a multi signature account with 20 Hbar starting balance
  const multiSigAccountID = await createMultiSigAccount(keyList);

  //Logging initial balances
  await accountBalance(multiSigAccountID);
  await accountBalance(ACCOUNT_4_ID);

  // Creating a Transaction to send 10 HBAR to ACCOUNT_4_ID from MultiSig account
  // const transaction = new TransferTransaction()
  //   .addHbarTransfer(multiSigAccountID, Hbar.fromString(`-10`))
  //   .addHbarTransfer(ACCOUNT_4_ID, Hbar.fromString('10'))
  //   .freezeWith(client);

  //   //**********
  // Schedule crypto transfer from multi-sig account to operator account
  const txSchedule = await (
    await new TransferTransaction()
      .addHbarTransfer(multiSigAccountID, Hbar.fromTinybars(-1))
      .addHbarTransfer(ACCOUNT_4_ID, Hbar.fromTinybars(1))
      .schedule() // create schedule
      .freezeWith(client)
      .sign(PrivateKey.fromString(ACCOUNT_1_PRIVATE_KEY))
  ).execute(client);

  const txScheduleReceipt = await txSchedule.getReceipt(client);
  console.log('Schedule status: ' + txScheduleReceipt.status.toString());
  const scheduleId = txScheduleReceipt.scheduleId;
  console.log('Schedule ID: ' + scheduleId);
  const scheduledTxId = txScheduleReceipt.scheduledTransactionId;
  console.log('Scheduled tx ID: ' + scheduledTxId);

  // Add Signature 2
  const txScheduleSign2 = await (
    await new ScheduleSignTransaction()
      .setScheduleId(scheduleId)
      .freezeWith(client)
      .sign(PrivateKey.fromString(ACCOUNT_2_PRIVATE_KEY))
  ) // Add Signature 1
    .execute(client);

  const txScheduleSign2Receipt = await txScheduleSign2.getReceipt(client);
  console.log(
    '2. ScheduleSignTransaction status: ' + txScheduleSign2Receipt.status.toString()
  );
 
  // Add Signature 3
  const txScheduleSign3 = await (
    await new ScheduleSignTransaction()
      .setScheduleId(scheduleId)
      .freezeWith(client)
      .sign(PrivateKey.fromString(ACCOUNT_3_PRIVATE_KEY))
  ).execute(client);

  const txScheduleSign3Receipt = await txScheduleSign3.getReceipt(client);
  console.log(
    '3. ScheduleSignTransaction status: ' + txScheduleSign3Receipt.status.toString()
  );
 
  // query schedule
  const scheduleInfo = await new ScheduleInfoQuery()
    .setScheduleId(scheduleId)
    .execute(client);
  //console.log(scheduleInfo);

  // query triggered scheduled tx
  const recordScheduledTx = await new TransactionRecordQuery()
    .setTransactionId(scheduledTxId)
    .execute(client);
 // console.log(recordScheduledTx);
  await accountBalance(multiSigAccountID);
  await accountBalance(ACCOUNT_4_ID);

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

const createMultiSigAccount = async (keys) => {
  const client = await getClient();
  const multiSigAccount = await new AccountCreateTransaction()
    .setKey(keys)
    .setInitialBalance(Hbar.fromString('20'))
    .execute(client);

  // Get the new account ID
  const getReceipt = await multiSigAccount.getReceipt(client);
  const multiSigAccountID = getReceipt.accountId;

  console.log('\nThe Multi Signature Account ID is: ' + multiSigAccountID);
  return multiSigAccountID;
};

const accountBalance = async (accountID) => {
  const client = await getClient();
  //Check the account's balance
  const getBalance = await new AccountBalanceQuery()
    .setAccountId(accountID)
    .execute(client);

  console.log(
    `\nBalance of ${accountID}: ` + getBalance.hbars.toTinybars() + ' tinybars.'
  );
};

main();
