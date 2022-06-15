const { exec, execSync } = require("child_process");
const jsforce = require("jsforce");
const fs = require("fs");
const RESULTS_DIRECTORY = "results";
const path = require("path");

const executeScript = (script, args = []) =>
  execSync(`${script} ${args.join(" ")}`, {
    stdio: ["pipe", "pipe", "ignore"]
  });

const executeScriptAsync = (script, args = []) =>
  new Promise((resolve, reject) => {
    exec(
      `${script} ${args.join(" ")}`,
      {
        stdio: ["pipe", "pipe", "ignore"]
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else if (stderr) {
          reject(stderr);
        } else {
          resolve(stdout);
        }
      }
    );
  });

const auth = () => {
  const { result } = JSON.parse(executeScript("sfdx force:org:display --json"));
  return new jsforce.Connection({
    instanceUrl: result.instanceUrl,
    accessToken: result.accessToken
  });
};

const getFields = (connection, object) => {
  return new Promise((resolve, reject) => {
    connection.sobject(object).describe((error, meta) => {
      if (error) {
        reject(error);
      }
      const compoundFieldNames = Array.from(
        new Set(
          meta.fields
            .filter((field) => {
              return field.compoundFieldName !== null;
            })
            .map((field) => {
              return field.compoundFieldName;
            })
        )
      );
      const fields = meta.fields
        .map((field) => {
          return field.name;
        })
        .filter((field) => {
          return !compoundFieldNames.includes(field);
        });

      resolve(fields);
    });
  });
};

const getRecordsBulk = (connection, object, fields) => {
  return new Promise((resolve, reject) => {
    const result = [];

    connection.bulk
      .query(`SELECT ${fields.join(", ")} FROM ${object}`)
      .on("record", (record) => {
        if (object === "Account") {
          result.push({
            ...record,
            WeGather__Envelope__c: record.AccountNumber
          });
        } else {
          result.push(record);
        }
      })
      .on("error", (error) => {
        reject(error);
      })
      .on("end", () => {
        resolve(result);
      });
  });
};

const generateCSV = async (alias, connection, object) => {
  console.log(`Started generating CSV for ${object} table...`);

  const fields = await getFields(connection, object);
  let records;

  for (let i = 0; i < 10 && !records; i++) {
    try {
      records = await getRecordsBulk(connection, object, fields);
    } catch (error) {
      if (i === 9) {
        console.error(error);
        throw new Error("Failed to get records");
      }
    }
  }

  console.log(`Found a total of ${records.length} ${object} records...`);

  if (records.length > 0) {
    const createCsvWriter = require("csv-writer").createObjectCsvWriter;

    const csvWriter = createCsvWriter({
      path: `./${RESULTS_DIRECTORY}/${alias}_${object}.csv`,
      header: Object.keys(records[0])
        .filter((key) => {
          return key !== "attributes";
        })
        .map((key) => {
          return {
            id: key,
            title: key
          };
        })
    });

    if (!fs.existsSync(RESULTS_DIRECTORY)) {
      fs.mkdirSync(RESULTS_DIRECTORY, { recursive: true });
    }

    await csvWriter.writeRecords(records);

    console.log(`Finished generating CSV for ${object} object...`);
  }
};

const emptyDirectory = () => {
  console.log("Deleting old CSV files...");

  fs.readdir(RESULTS_DIRECTORY, (err, files) => {
    if (err) {
      throw err;
    }

    for (const file of files) {
      fs.unlink(path.join(RESULTS_DIRECTORY, file), (err) => {
        if (err) {
          throw err;
        }
      });
    }
  });
};

const setDefaultOrg = (alias) => {
  console.log(`Setting default org: ${alias}`);

  executeScript(`sfdx config:set defaultusername=${alias}`);
};

module.exports = {
  executeScript,
  executeScriptAsync,
  auth,
  getRecordsBulk,
  generateCSV,
  emptyDirectory,
  setDefaultOrg,
  getFields
};
