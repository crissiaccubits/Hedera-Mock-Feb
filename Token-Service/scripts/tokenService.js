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
  TokenBurnTransaction,
  TokenNftInfoQuery,
  NftId,
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  TransactionId,
  TokenPauseTransaction,
  TokenUnpauseTransaction,
  TokenFreezeTransaction,
  TokenUnfreezeTransaction,
  TokenWipeTransaction
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
  ACCOUNT_5_ID,
  ACCOUNT_5_PRIVATE_KEY,
} = process.env;

const clientUser = new Wallet(CLIENT_ID, CLIENT_PRIVATE_KEY);

const supplyUser = new Wallet(ACCOUNT_4_ID, ACCOUNT_4_PRIVATE_KEY);

const commonUser = new Wallet(ACCOUNT_4_ID, ACCOUNT_4_PRIVATE_KEY);

let tokenId;

async function main() {
  //Token Creation
  console.log('Token Creation********');
  await createToken();
  //Mint Token
  console.log('Token Mint********');
  await mintTxn();
  //Pause Token
  console.log('Token Pause********');
  await tokenPause(tokenId, ACCOUNT_4_ID, ACCOUNT_4_PRIVATE_KEY);
  //Assoc Token
  console.log('Token Associate********');
  await assocTokens(ACCOUNT_3_ID, ACCOUNT_3_PRIVATE_KEY);
  //Unpause Token
  console.log('Token Pause********');
  await tokenUnpause(tokenId, ACCOUNT_4_ID, ACCOUNT_4_PRIVATE_KEY);
  //Assoc Token
  console.log('Token Associate********');
  await assocTokens(ACCOUNT_3_ID, ACCOUNT_3_PRIVATE_KEY);
  //Transfer Token
  console.log('Token Transfer********');
  await transferToken(ACCOUNT_1_ID, ACCOUNT_1_PRIVATE_KEY, ACCOUNT_3_ID, 2);
  console.log('Token Transfer********');
  await transferToken(ACCOUNT_1_ID, ACCOUNT_1_PRIVATE_KEY, ACCOUNT_3_ID, 3);
  //Wipe Token
  console.log('Token Wipe********');
  await wipeToken(tokenId,ACCOUNT_4_ID, ACCOUNT_4_PRIVATE_KEY, ACCOUNT_3_ID, 2);
  //freeze Token
  console.log('Token freeze********');
  await tokenFreeze(tokenId,ACCOUNT_4_ID, ACCOUNT_4_PRIVATE_KEY, ACCOUNT_3_ID, 2);
  //Unfreeze Token
  console.log('Token Unfreeze********');
  await tokenUnfreeze(tokenId,ACCOUNT_4_ID, ACCOUNT_4_PRIVATE_KEY, ACCOUNT_3_ID, 2);
 

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
    .setPauseKey(commonUser.publicKey)
    .setFreezeKey(commonUser.publicKey)
    .setWipeKey(commonUser.publicKey)
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
const mintTxn = async () => {
  const client = await getClient();

  //Create the token mint transaction
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
};

const assocTokens = async (account, pvtKey) => {
  const client = await getClient();

  try {
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
}catch (err) {
    //console.log('Error in token transfer: ' + err);
    //Logging the error
    console.error('\nThe transaction errored with message ' + err.status.toString());
    console.error('\nError:' + err.toString());
  }
};
const transferToken = async (sender, senderPvtKey, receiver, nftId) => {
  const client = await getClient();

  //Create the transfer transaction
  try {
    const transaction = new TransferTransaction()
      .addNftTransfer(
        TokenId.fromString(tokenId),
        nftId,
        AccountId.fromString(sender),
        AccountId.fromString(receiver)
      )
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

    await queryBalance(ACCOUNT_3_ID, tokenId);
    await queryBalance(ACCOUNT_1_ID, tokenId);
  } catch (err) {
    console.log('Error in token transfer: ' + err);
  }
};

const tokenInfo = async (NFTTokenIndex, tokenId) => {
  const client = await getClient();

  console.log(`Searching for NFT ID ${NFTTokenIndex} on token ${tokenId}`);

  //Returns the info for the specified NFT ID
  const nftInfos = await new TokenNftInfoQuery()
    .setNftId(new NftId(TokenId.fromString(tokenId), NFTTokenIndex))
    .execute(client);

  console.log('The ID of the token is: ' + nftInfos[0].nftId.tokenId.toString());
  console.log('The serial of the token is: ' + nftInfos[0].nftId.serial.toString());
  console.log('The metadata of the token is: ' + nftInfos[0].metadata.toString());
  console.log('Current owner: ' + new AccountId(nftInfos[0].accountId).toString());
};

const queryBalance = async (user, tokenId) => {
  const client = await getClient();

  //Create the query
  const balanceQuery = new AccountBalanceQuery().setAccountId(user);

  //Sign with the client operator private key and submit to a Hedera network
  const tokenBalance = await balanceQuery.execute(client);

  console.log(
    `- Balance of account ${user}: ${tokenBalance.hbars.toString()} + ${tokenBalance.tokens._map.get(
      tokenId.toString()
    )} unit(s) of token ${tokenId}`
  );
};

const tokenPause = async (tokenId, pauseId, pauseKey) => {
  const client = await getClient();
  //Create the pause transaction and Sign with the supply private key of the token
  let tokenPauseTx = await new TokenPauseTransaction()
    .setTokenId(tokenId)
    .freezeWith(client)
    .sign(PrivateKey.fromString(pauseKey));

  //Submit the transaction to a Hedera network
  let tokenPauseSubmitTx = await tokenPauseTx.execute(client);
  //Request the receipt of the transaction
  let tokenPauseRx = await tokenPauseSubmitTx.getReceipt(client);
  console.log(`- Token pause: ${tokenPauseRx.status}`);
};

const tokenUnpause = async (tokenId, pauseId, pauseKey) => {
  const client = await getClient();
  //Create the unpause transaction and Sign with the supply private key of the token
  let tokenUnpauseTx = await new TokenUnpauseTransaction()
    .setTokenId(tokenId)
    .freezeWith(client)
    .sign(PrivateKey.fromString(pauseKey));
  //Submit the transaction to a Hedera network
  let tokenUnpauseSubmitTx = await tokenUnpauseTx.execute(client);
  //Request the receipt of the transaction
  let tokenUnpauseRx = await tokenUnpauseSubmitTx.getReceipt(client);
  console.log(`- Token unpause: ${tokenUnpauseRx.status}\n`);
};
const tokenFreeze = async (tokenId, freezeId, freezeKey, otherUserId) => {
  const client = await getClient();
  //Create the freeze transaction and Sign with the supply private key of the token
  let tokenFreezeTx = await new TokenFreezeTransaction()
    .setTokenId(tokenId)
    .setAccountId(otherUserId)
    .freezeWith(client)
    .sign(PrivateKey.fromString(freezeKey));
  //Submit the transaction to a Hedera network
  let tokenFreezeSubmit = await tokenFreezeTx.execute(client);
  //Request the receipt of the transaction
  let tokenFreezeRx = await tokenFreezeSubmit.getReceipt(client);
  console.log(`- Freeze Alice's account for token ${tokenId}: ${tokenFreezeRx.status}`);
};
const tokenUnfreeze = async (tokenId, freezeId, freezeKey, otherUserId) => {
  const client = await getClient();
  //Create the unfreeze transaction and Sign with the supply private key of the token
  let tokenUnfreezeTx = await new TokenUnfreezeTransaction()
    .setTokenId(tokenId)
    .setAccountId(otherUserId)
    .freezeWith(client)
    .sign(PrivateKey.fromString(freezeKey));
  //Submit the transaction to a Hedera network
  let tokenUnfreezeSubmit = await tokenUnfreezeTx.execute(client);
  //Request the receipt of the transaction
  let tokenUnfreezeRx = await tokenUnfreezeSubmit.getReceipt(client);
  console.log(
    `- Unfreeze Alice's account for token ${tokenId}: ${tokenUnfreezeRx.status}\n`
  );
};
const wipeToken = async (tokenId, wipeId, wipeKey, otherUserId, nftId) => {
  const client = await getClient();
  //Create the wipe transaction and Sign with the supply private key of the token
  let tokenWipeTx = await new TokenWipeTransaction()
    .setAccountId(otherUserId)
    .setTokenId(tokenId)
    .setSerials([nftId])
    .freezeWith(client)
    .sign(PrivateKey.fromString(wipeKey));
  //Submit the transaction to a Hedera network
  let tokenWipeSubmitTx = await tokenWipeTx.execute(client);
  //Request the receipt of the transaction
  let tokenWipeRx = await tokenWipeSubmitTx.getReceipt(client);
  console.log(`- Wipe token ${tokenId} from other user's account: ${tokenWipeRx.status}`);
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
