// node ./scripts/node/exportSacramento.js

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
  emptyDirectory();
  const connection = auth("scd");
  connection.bulk.pollInterval = 5000;
  connection.bulk.pollTimeout = 1800000;
  const objectsInOrg = await getObjectsInOrg(connection);
  const objectsToExport = [];

  for (const thisObject of objectsInOrg) {
    const shouldExport = await shouldExportObject(connection, thisObject);
    if (shouldExport) {
      console.log("Added object: " + thisObject);
      objectsToExport.push(thisObject);
    }
  }
  console.log(objectsToExport.length);
  objectsToExport.map((object) => {
    return generateCSV("scd", connection, object);
  });
};

//returns a list of strings of every objects name in the org
const getObjectsInOrg = (connection) => {
  return new Promise((resolve, reject) => {
    connection.describeGlobal((err, resp) => {
      const nameOfObjects = [];
      for (const thisObject in resp.sobjects) {
        nameOfObjects.push(resp.sobjects[thisObject].name);
      }
      resolve(nameOfObjects);
    });
  });
};

// returns a promise that resolves into a boolean
// takes the name of a singe object
// use describe call on a single object
const shouldExportObject = (connection, thisObject) => {
  return new Promise((resolve, reject) => {
    if (thisObject.includes("__e")) {
      resolve(false);
    } else if (thisObject.includes("__mdt")) {
      resolve(false);
    } else if (thisObject.includes("Share")) {
      resolve(false);
    } else if (thisObject.includes("ChangeEvent")) {
      resolve(false);
    } else if (
      thisObject.includes("__c") &&
      thisObject.includes("WeGather__")
    ) {
      resolve(true);
    } else {
      connection.sobject(thisObject).describe((err, meta) => {
        if (meta) {
          const hasWeGatherFields = meta.fields.some((field) => {
            return field.name.includes("WeGather");
          });
          resolve(hasWeGatherFields);
        } else if (err) {
          reject(err);
        }
      });
    }
  });
};

execute();
