// node --max-old-space-size=8192 ./scripts/node/exportData.js

const fs = require("fs");
const { auth, executeScript } = require("./scriptUtils");
const path = require("path");

const OBJECTS_TO_EXPORT = [
  "Organization",
  "Account",
  "Contact",
  "User",
  "WeGather__Batch__c",
  "WeGather__Fee2__c",
  "WeGather__Financial_Account__c",
  "WeGather__Fund__c",
  "WeGather__Payment_Method__c",
  "WeGather__Pledge__c",
  "WeGather__Recurring_Payment__c",
  "WeGather__Schedule__c",
  "WeGather__Schedule_Line_Item__c",
  "WeGather__Schedule_Skip_Date__c",
  "WeGather__Transaction__c"
];
const WESHARE_ORG_IDS = [
  "stmonicamoraga",
  "stjohnthebaptistcostamesa",
  "lovebuildshope",
  "maryimmaculatechurch",
  "bellarminechapel",
  "stmichaelcanton",
  "stgertrude",
  "holynamenyc",
  "wg-sthenryaverillpark",
  "Blessedsacrament-sandiego",
  "holyapostlesmeridian",
  "ctkparish",
  "cathedralolph",
  "catholicsteamboat",
  "stanthony-sthyacinth",
  "stpetersboerne",
  "motherofourredeemer",
  "st-rita",
  "stpetermadison",
  "mygoodshepherd",
  "saintjohncathedrallafayette",
  "stmatthewhillsboro",
  "scd",
  "worldwidehealinghand",
  "stcolmanchurch",
  "holytrinitycohoes",
  "localnewsinitiative",
  "stannlenox",
  "stpiusxportland",
  "stanselmstl",
  "northadamscatholics",
  "birdrescuecenter",
  "sariverdale",
  "stedward",
  "holytrinityparish",
  "stmarygrinnell",
  "stignatiussac",
  "fivesaintscommunitystcecelia",
  "stmary-strobert2",
  "stmary-strobert",
  "twocountrysaints",
  "stfranciskrcatholics",
  "stpaulgenesee",
  "stmarysgi",
  "saintbrigidparish",
  "corpuschristi-phoenix",
  "archseattle",
  "sjbplymouth"
];
const MAX_RECORDS_IN_SINGLE_SOQL_QUERY = 50000;
const RESULTS_DIRECTORY = "results";

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

const execute = async () => {
  emptyDirectory();

  for (const alias of WESHARE_ORG_IDS) {
    setDefaultOrg(alias);

    const connection = auth(alias);
    connection.bulk.pollInterval = 5000;
    connection.bulk.pollTimeout = 1800000;

    await Promise.all(
      OBJECTS_TO_EXPORT.map((object) => {
        return generateCSV(alias, connection, object);
      })
    );
  }
};

execute();
