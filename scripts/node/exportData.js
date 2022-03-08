// npm run export:data

const fs = require("fs");
const { auth, executeScript } = require("./scriptUtils");
const path = require("path");

const OBJECTS_TO_EXPORT = [
  "Organization",
  "Account",
  "Contact",
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

const getRecords = async (connection, object) => {
  console.log(`Started querying for ${object} records...`);

  const result = [];
  let offset = 0;

  while (true) {
    const records = await connection
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

const generateCSV = async (alias, connection, object) => {
  console.log(`Started generating CSV for ${object} table...`);

  const records = await getRecords(connection, object);

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

    await Promise.all(
      OBJECTS_TO_EXPORT.map((object) => {
        return generateCSV(alias, connection, object);
      })
    );
  }
};

execute();
