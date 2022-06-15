// node --max-old-space-size=8192 ./scripts/node/exportData.js

const {
  auth,
  generateCSV,
  emptyDirectory,
  setDefaultOrg
} = require("./scriptUtils");

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
