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

let tokenId;

async function main() {
  await createToken();
  await mintAndTransfer();
  process.exit();
}

const createToken = async () => {
  const client = await getClient();

  //Creating Royalty Fee Account
  const nftCustomFee = new CustomRoyaltyFee()
    .setNumerator(1)
    .setDenominator(10)
    .setFeeCollectorAccountId(AccountId.fromString(ACCOUNT_2_ID))
    .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(200)));

  const transaction = new TokenCreateTransaction()
    .setTokenName('Hedera Certificate Token ')
    .setTokenSymbol('HCT')
    .setTokenType(TokenType.NonFungibleUnique)
    .setTreasuryAccountId(AccountId.fromString(ACCOUNT_1_ID))
    .setInitialSupply(0)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(5)
    .setCustomFees([nftCustomFee])
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

const mintAndTransfer = async () => {
  const client = await getClient();

  const transaction = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata([
      Buffer.from('NFT 1'),
      Buffer.from('NFT 2'),
      Buffer.from('NFT 3'),
      Buffer.from('NFT 4'),
      Buffer.from('NFT 5'),
    ])
    .freezeWith(client);

  //Sign with the supply private key of the token
  const signTx = await transaction.sign(PrivateKey.fromString(ACCOUNT_4_PRIVATE_KEY));

  //Submit the transaction to a Hedera network
  const txResponse = await signTx.execute(client);

  //Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the transaction consensus status
  const transactionStatus = receipt.status;

  console.log('The transaction consensus status ' + transactionStatus.toString());

  await queryBalance(ACCOUNT_1_ID, tokenId);

  const associateBuyerTx = await new TokenAssociateTransaction()
    .setAccountId(ACCOUNT_3_ID)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(PrivateKey.fromString(ACCOUNT_3_PRIVATE_KEY));

  const associateBuyerTxSubmit = await associateBuyerTx.execute(client);

  const associateBuyerRx = await associateBuyerTxSubmit.getReceipt(client);

  console.log(`Token association with the other account: ${associateBuyerRx.status} \n`);

  //Create the transfer transaction
  try {
    const transaction = new TransferTransaction()
      .addNftTransfer(
        TokenId.fromString(tokenId),
        2,
        AccountId.fromString(ACCOUNT_1_ID),
        AccountId.fromString(ACCOUNT_3_ID)
      )
      .freezeWith(client);

    //Sign with the supply private key of the token
    const signTx = await transaction.sign(PrivateKey.fromString(ACCOUNT_1_PRIVATE_KEY));

    //Sign with the account 3 private key of the token
    const signedTx = await signTx.sign(PrivateKey.fromString(ACCOUNT_3_PRIVATE_KEY));

    //Submit the transaction to a Hedera network
    const txResponse = await signedTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the transaction consensus status
    const transactionStatus = receipt.status;
    console.log('The transaction consensus status ' + transactionStatus.toString());
    console.log('The transaction Id ' + txResponse.transactionId.toString());

    await queryBalance(ACCOUNT_3_ID, tokenId);
    await queryBalance(ACCOUNT_1_ID, tokenId);
  } catch (err) {
    console.log('Error in token transfer: ' + err);
  }
};

const queryBalance = async (user, tokenId) => {
  const client = await getClient();
  //Create the query
  const balanceQuery = new AccountBalanceQuery().setAccountId(user);

  //Sign with the client operator private key and submit to a Hedera network
  const tokenBalance = await balanceQuery.execute(client);

  console.log(
    "The balance of the user '" +
      user +
      "' is: " +
      tokenBalance.tokens.get(tokenId) +
      '\n'
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
