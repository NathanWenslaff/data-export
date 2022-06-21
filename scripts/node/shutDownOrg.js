// node ./scripts/node/shutDownOrg.js [WeShare Org ID]

const {
  auth,
  executeScript,
  getRecordsBulk,
  generateCSV,
  emptyDirectory,
  setDefaultOrg,
  getFields
} = require("./scriptUtils");

const execute = async () => {
  //demo-pe-christservantparish   STAGING ORG
  const thisOrg = process.argv[2];
  console.log("Shutting down " + thisOrg + "...");
  const connection = auth(thisOrg);
  connection.bulk.pollInterval = 5000;
  connection.bulk.pollTimeout = 1800000;
  let finished = false;
  let numberOfRounds = 1;

  console.log("Deactivating users...");
  while (!finished) {
    const queryResults = await getUsersToDeactivate(connection);
    const usersToDeactivate = queryResults.records;
    if (usersToDeactivate.length === 0) {
      console.log("No more users found.");
      finished = true;
    } else {
      console.log(
        `${numberOfRounds}: Found ${usersToDeactivate.length} Users to deactivate. Attempting to deactivate...`
      );
      ++numberOfRounds;
      await makeUsersInactive(connection, usersToDeactivate);
    }
  }

  console.log("Disabling all recurring payments...");
  finished = false;
  numberOfRounds = 1;
  while (!finished) {
    const queryResults = await getRecurringPayments(connection);
    const recurringPayments = queryResults.records;
    if (recurringPayments.length === 0) {
      console.log("No more recurring payments found.");
      finished = true;
    } else {
      console.log(
        `${numberOfRounds}: Found ${recurringPayments.length} recurring payments to deactivate. Attempting to deactivate...`
      );
      ++numberOfRounds;
      await makeRecurringPaymentsInactive(connection, recurringPayments);
    }
  }

  console.log("Deleting scheduled transactions...");
  finished = false;
  numberOfRounds = 1;
  while (!finished) {
    const queryResults = await getScheduledTransactions(connection);
    const scheduledTransactions = queryResults.records;
    if (scheduledTransactions.length === 0) {
      console.log("No more scheduled transactions found.");
      finished = true;
    } else {
      console.log(
        `${numberOfRounds}: Found ${scheduledTransactions.length} transactions to delete. Attempting to delete...`
      );
      ++numberOfRounds;
      await deleteScheduledTransactions(connection, scheduledTransactions);
    }
  }

  console.log("Deactivating funds...");
  finished = false;
  numberOfRounds = 1;
  while (!finished) {
    const queryResults = await getFunds(connection);
    const funds = queryResults.records;
    if (funds.length !== 0) {
      console.log(
        `${numberOfRounds}: Found ${funds.length} funds to deactivate. Attempting to deactivate...`
      );
      await makeFundsInactive(connection, funds);
      ++numberOfRounds;
    } else {
      console.log("All funds deactivated.");
      finished = true;
    }
  }

  console.log("Deleting scheduled jobs...");
  executeScript(
    "sfdx force:apex:execute -f ./scripts/apex/deleteScheduledJobs.apex"
  );
  console.log("All scheduled jobs deleted.");
};

const getUsersToDeactivate = (connection) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT Id FROM User WHERE UserType = 'CspLitePortal' AND IsActive = True Limit 50",
      function (err, result) {
        if (err) {
          console.error("Failed to get users: ", err);
          reject(err);
        } else if (result) {
          resolve(result);
        }
      }
    );
  });
};

const makeUsersInactive = (connection, listOfUsers) => {
  return new Promise((resolve, reject) => {
    connection.sobject("User").update(
      listOfUsers.map(function (thisUser) {
        return { Id: thisUser.Id, IsActive: false };
      }),
      function (err, results) {
        if (err) {
          console.error("Failed to deactivate users:", err);
          reject(err);
        } else if (results) {
          resolve(results);
        }
      }
    );
  });
};

const getRecurringPayments = (connection) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT Id FROM WeGather__Recurring_Payment__c WHERE WeGather__Active__c = True Limit 50",
      function (err, result) {
        if (err) {
          console.error("Failed to get recurring payments: ", err);
          reject(err);
        } else if (result) {
          resolve(result);
        }
      }
    );
  });
};

const makeRecurringPaymentsInactive = (connection, listOfRecurringPayments) => {
  return new Promise((resolve, reject) => {
    connection.sobject("WeGather__Recurring_Payment__c").update(
      listOfRecurringPayments.map(function (thisRecurringPayment) {
        return { Id: thisRecurringPayment.Id, WeGather__Active__c: false };
      }),
      function (err, results) {
        if (err) {
          console.error("Failed to deactivate recurring payments: ", err);
          reject(err);
        } else if (results) {
          resolve(results);
        }
      }
    );
  });
};

const getScheduledTransactions = (connection) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT Id FROM WeGather__Transaction__c WHERE WeGather__Status__c = 'Scheduled' Limit 50",
      function (err, result) {
        if (err) {
          console.error("Failed to get scheduled transactions: ", err);
          reject(err);
        } else if (result) {
          resolve(result);
        }
      }
    );
  });
};

const deleteScheduledTransactions = (connection, scheduledTransactions) => {
  return new Promise((resolve, reject) => {
    connection.sobject("WeGather__Transaction__c").del(
      scheduledTransactions.map(function (thisTransaction) {
        return thisTransaction.Id;
      }),
      function (err, results) {
        if (err) {
          console.error("Failed to delete scheduled transactions:", err);
          reject(err);
        } else if (results) {
          resolve(results);
        }
      }
    );
  });
};

const getFunds = (connection) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT Id FROM WeGather__Fund__c WHERE WeGather__Available_for_Payments__c = True Limit 50",
      function (err, result) {
        if (err) {
          console.error("Failed to get scheduled transactions: ", err);
          reject(err);
        } else if (result) {
          resolve(result);
        }
      }
    );
  });
};

const makeFundsInactive = (connection, listOfFunds) => {
  return new Promise((resolve, reject) => {
    connection.sobject("WeGather__Fund__c").update(
      listOfFunds.map(function (thisFund) {
        return { Id: thisFund.Id, WeGather__Available_for_Payments__c: false };
      }),
      function (err, results) {
        if (err) {
          console.error("Failed to deactivate fund: ", err);
          reject(err);
        } else if (results) {
          resolve(results);
        }
      }
    );
  });
};

execute();
