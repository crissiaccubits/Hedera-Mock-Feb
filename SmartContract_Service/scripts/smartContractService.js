const {
  Client,
  ContractExecuteTransaction,
  PrivateKey,
  ContractCreateFlow,
  ContractFunctionParameters,
  ContractCallQuery,
  Hbar,
} = require('@hashgraph/sdk');

require('dotenv').config();
const contractJSON = require('../artifacts/LookupContract.json');

//Grab your Hedera testnet account ID and private key from your .env file
const { ACCOUNT_1_PRIVATE_KEY, ACCOUNT_1_ID } = process.env;

const main = async () => {
  const client = await getClient();

  //Extracting bytecode from compiled code
  const bytecode = contractJSON.bytecode;

  //Create the transaction
  const contractCreation = new ContractCreateFlow()
    .setGas(100000)
    .setBytecode(bytecode) //Provide the constructor parameters for the contract
    .setConstructorParameters(
      new ContractFunctionParameters().addString('Alice').addUint256(123456)
    );

  //Sign the transaction with the client operator key and submit to a Hedera network
  const txResponse = await contractCreation.execute(client);

  //Get the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the new contract ID
  const contractId = receipt.contractId;

  console.log('The contract ID is ' + contractId);

  //Create the transaction to update the contract message
  const contractExecTx = await new ContractExecuteTransaction()
    //Set the ID of the contract
    .setContractId(contractId)
    //Set the gas for the contract call
    .setGas(100000)
    //Set the contract function to call
    .setFunction(
      'setMobileNumber',
      new ContractFunctionParameters().addString('Bob').addUint256(789012)
    );

  //Submit the transaction to a Hedera network and store the response
  const submitExecTx = await contractExecTx.execute(client);

  //Get the receipt of the transaction
  const receipt2 = await submitExecTx.getReceipt(client);

  //Confirm the transaction was executed successfully
  console.log('The transaction status is ' + receipt2.status.toString());

  await getCall(contractId, 'Alice');
  await getCall(contractId, 'Bob');

  process.exit();
};

//To create client object
const getClient = async () => {
  // If we weren't able to grab it, we should throw a new error
  if (ACCOUNT_1_ID == null || ACCOUNT_1_PRIVATE_KEY == null) {
    throw new Error(
      'Environment variables ACCOUNT_1_ID and ACCOUNT_1_PRIVATE_KEY must be present'
    );
  }

  // Create our connection to the Hedera network
  return Client.forTestnet().setOperator(ACCOUNT_1_ID, ACCOUNT_1_PRIVATE_KEY);
};
//To execution the contract get method
const getCall = async (contractId, user) => {
  const client = await getClient();

  //Query the contract for the contract message
  const contractCallQuery = new ContractCallQuery()
    //Set the ID of the contract to query
    .setContractId(contractId)
    //Set the gas to execute the contract call
    .setGas(100000)
    //Set the contract function to call
    .setFunction('getMobileNumber', new ContractFunctionParameters().addString(user))
    //Set the query payment for the node returning the request
    //This value must cover the cost of the request otherwise will fail
    .setQueryPayment(new Hbar(10));

  //Submit the transaction to a Hedera network
  const contractQuerySubmit = await contractCallQuery.execute(client);
  const mobileNo = contractQuerySubmit.getUint256(0);
  //Log the updated message to the console
  console.log('The mobile number for ' + user + ' is ' + mobileNo);
};
main();
