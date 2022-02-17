// npm run export:data

const fs = require("fs");
const { auth } = require("./scriptUtils");

const CONNECTION = auth();
const OBJECTS_TO_EXPORT = ["Account", "Contact"];
const MAX_RECORDS_IN_SINGLE_SOQL_QUERY = 50000;
const RESULTS_DIRECTORY = "results";

const getRecords = async (object) => {
  console.log(`Started querying for ${object} records...`);

  const result = [];
  let offset = 0;

  while (true) {
    const records = await CONNECTION.sobject(object)
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

const generateCSV = async (object) => {
  console.log(`Started generating CSV for ${object} table...`);

  const records = await getRecords(object);

  console.log(`Found a total of ${records.length} ${object} records...`);

  if (records.length > 0) {
    const createCsvWriter = require("csv-writer").createObjectCsvWriter;

    const csvWriter = createCsvWriter({
      path: `./${RESULTS_DIRECTORY}/${object}.csv`,
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

const execute = async () => {
  for (const object of OBJECTS_TO_EXPORT) {
    await generateCSV(object);
  }
};

execute();
