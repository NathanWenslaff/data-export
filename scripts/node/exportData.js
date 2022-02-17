// npm run export:data

const fs = require("fs");
const { auth } = require("./scriptUtils");

const conn = auth();
const OBJECTS_TO_EXPORT = ["Account", "Contact"];
const MAX_RECORDS_IN_SINGLE_SOQL_QUERY = 1000;
const resultsDirectory = "results";

const getRecords = async (object) => {
  console.log(`Started querying for ${object} records...`);

  const result = [];
  let offset = 0;

  while (true) {
    const records = await conn
      .sobject(object)
      .find()
      .limit(MAX_RECORDS_IN_SINGLE_SOQL_QUERY)
      .skip(offset)
      .execute();

    result.push(...records);

    if (records.length < MAX_RECORDS_IN_SINGLE_SOQL_QUERY) {
      break;
    } else {
      console.log(`Found ${result.length} ${object} records so far...`);
      offset += MAX_RECORDS_IN_SINGLE_SOQL_QUERY;
    }
  }

  console.log(`Finished querying for ${object} records...`);
  return result;
};

const getCSV = async (object) => {
  const records = await getRecords(object);

  if (records.length > 0) {
    const createCsvWriter = require("csv-writer").createObjectCsvWriter;

    const csvWriter = createCsvWriter({
      path: `./${resultsDirectory}/${object}.csv`,
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

    if (!fs.existsSync(resultsDirectory)) {
      fs.mkdirSync(resultsDirectory, { recursive: true });
    }

    await csvWriter.writeRecords(records);
  }
};

const execute = async () => {
  for (const object of OBJECTS_TO_EXPORT) {
    await getCSV(object);
  }
};

execute();
