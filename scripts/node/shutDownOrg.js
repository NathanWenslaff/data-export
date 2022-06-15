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
  //bellarminechapel
  //stpetersboerne
  //demo-pe-christservantparish   STAGING ORG
  const thisOrg = process.argv[2];
  console.log("Shutting down " + thisOrg + "...");
  const connection = auth(thisOrg);
  connection.bulk.pollInterval = 5000;
  connection.bulk.pollTimeout = 1800000;
  let finished = false;
  let numberOfRounds = 1;

  //TODO: Switch to system email only

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

  //TODO: Delete scheduled jobs

  // console.log("Deleting scheduled jobs...");
  // finished = false;
  // numberOfRounds = 1;
  // while (!finished) {
  //     const queryResults = await getScheduledJobs(connection);
  //     const scheduledJobs = queryResults.records;
  //     if (scheduledTransactions.length === 0) {
  //         console.log("No more scheduled jobs found.");
  //         finished = true;
  //     }
  //     else {
  //         console.log(`${numberOfRounds}: Found ${scheduledTransactions.length} transactions to delete. Attempting to delete...`);
  //         ++numberOfRounds;
  //         await deleteScheduledTransactions(connection, scheduledTransactions);
  //     }
  // }

  //TODO: Disable sites
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

const getScheduledJobs = (connection) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT COUNT() FROM CronTrigger Limit 10",
      function (err, result) {
        if (err) {
          console.error("Failed to get scheduled jobs: ", err);
          reject(err);
        } else if (result) {
          console.log(result);
          resolve(result);
        }
      }
    );
  });
};

execute();
