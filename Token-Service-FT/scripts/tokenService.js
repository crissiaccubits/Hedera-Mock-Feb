const {
  TokenCreateTransaction,
  Client,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  AccountBalanceQuery,
  PrivateKey,
  Wallet,
  CustomFixedFee,
  Hbar,
  TokenId,
  AccountId,
  TransferTransaction,
  TokenAssociateTransaction,
  CustomRoyaltyFee,
  CustomFractionalFee
} = require('@hashgraph/sdk');
require('dotenv').config();

//Grab your Hedera testnet account ID and private key from your .env file
const {
  CLIENT_ID,
  CLIENT_PRIVATE_KEY,
  ACCOUNT_1_ID,
  ACCOUNT_1_PRIVATE_KEY,
  ACCOUNT_2_ID,
  ACCOUNT_2_PRIVATE_KEY,
  ACCOUNT_3_ID,
  ACCOUNT_3_PRIVATE_KEY,
  ACCOUNT_4_ID,
  ACCOUNT_4_PRIVATE_KEY,
} = process.env;

const clientUser = new Wallet(CLIENT_ID, CLIENT_PRIVATE_KEY);

const supplyUser = new Wallet(ACCOUNT_4_ID, ACCOUNT_4_PRIVATE_KEY);

const feeCollector = new Wallet(ACCOUNT_1_ID, ACCOUNT_1_PRIVATE_KEY);

let tokenId;

async function main() {
  await createToken();
  //Assoc Token
  console.log('Token Associate********');
  await assocTokens(ACCOUNT_3_ID, ACCOUNT_3_PRIVATE_KEY);
  //Transfer Token
  console.log('Token Transfer********');
  await transferToken(ACCOUNT_1_ID, ACCOUNT_1_PRIVATE_KEY, ACCOUNT_3_ID, 10);
  process.exit();
}

const createToken = async () => {
  const client = await getClient();

  //Create a custom token fractional fee
  const fractionalFee = new CustomFractionalFee()
    .setNumerator(1) // The numerator of the fraction
    .setDenominator(10) // The denominator of the fraction
    .setFeeCollectorAccountId(feeCollector.accountId); //

  const transaction = new TokenCreateTransaction()
    .setTokenName('Hedera Certificate Token ')
    .setTokenSymbol('HCT')
    .setTokenType(TokenType.FungibleUnique)
    .setTreasuryAccountId(AccountId.fromString(ACCOUNT_1_ID))
    .setInitialSupply(1000)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(5000)
    .setCustomFees([fractionalFee])
    .setMaxTransactionFee(new Hbar(50))
    .setAdminKey(clientUser.publicKey)
    .setSupplyKey(supplyUser.publicKey)
    .freezeWith(client);

  //Sign the transaction with the client, who is set as admin and treasury account
  const signTx = await transaction.sign(PrivateKey.fromString(ACCOUNT_1_PRIVATE_KEY));

  //Submit to a Hedera network
  const txResponse = await signTx.execute(client);

  //Get the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the token ID from the receipt
  tokenId = receipt.tokenId;

  console.log('The new token ID is ' + tokenId + '\n');
};
const assocTokens = async (account, pvtKey) => {
  const client = await getClient();

  //Create the token associate transaction
  //and sign with the receiver private key of the token
  const associateBuyerTx = await new TokenAssociateTransaction()
    .setAccountId(account)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(PrivateKey.fromString(pvtKey));

  //Submit the transaction to a Hedera network
  const associateBuyerTxSubmit = await associateBuyerTx.execute(client);

  //Request the receipt of the transaction
  const associateBuyerRx = await associateBuyerTxSubmit.getReceipt(client);

  //Get the transaction consensus status
  console.log(`Token association with the other account: ${associateBuyerRx.status} \n`);
};
const transferToken = async (sender, senderPvtKey, receiver, amount) => {
  const client = await getClient();

  //Create the transfer transaction
  try {
    const transaction = new TransferTransaction()
      .addTokenTransfer(tokenId, sender, -amount)
      .addTokenTransfer(tokenId, receiver, amount)
      .freezeWith(client);

    //Sign with the supply private key of the token
    const signTx = await transaction.sign(PrivateKey.fromString(senderPvtKey));

    //Submit the transaction to a Hedera network
    const txResponse = await signTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the transaction consensus status
    const transactionStatus = receipt.status;
    console.log('The transaction consensus status ' + transactionStatus.toString());
    console.log('The transaction Id ' + txResponse.transactionId.toString());

    await queryBalance(sender, tokenId);
    await queryBalance(receiver, tokenId);
  } catch (err) {
    //Logging the error
    console.error('\nThe transaction errored with message ' + err.status.toString());
    console.error('\nError:' + err.toString());
  }
};
const queryBalance = async (user, tokenId) => {
  const client = await getClient();

  //Create the query
  const balanceQuery = new AccountBalanceQuery().setAccountId(user);

  //Sign with the client operator private key and submit to a Hedera network
  const tokenBalance = await balanceQuery.execute(client);

  // console.log(
  //   `- Balance of account ${user}: ${tokenBalance.hbars.toString()} + ${tokenBalance.tokens._map.get(
  //     tokenId.toString()
  //   )} unit(s) of token ${tokenId}`
  // );
  console.log(
    `- Balance of account ${user}: ${tokenBalance.tokens._map.get(
      tokenId.toString()
    )} unit(s) of token ${tokenId}`
  );
};
//To create client object
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

main();
