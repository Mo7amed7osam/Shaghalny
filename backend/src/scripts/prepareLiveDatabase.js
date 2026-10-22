const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const User = require("../models/User");
const Skill = require("../models/Skill");
const Job = require("../models/Job");

// Creates an empty marketplace database. Only configuration (skill taxonomy) and
// non-demo administrator accounts are copied. No users, projects, proposals,
// contracts, reviews, interview results, balances or transactions are carried over.
async function prepareLiveDatabase() {
  const [database, sourceDatabase] = process.argv.slice(2);
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri || !/^Shaghalny-Live-\d{8}$/.test(database || "") || !sourceDatabase) {
    throw new Error("Usage: node src/scripts/prepareLiveDatabase.js Shaghalny-Live-YYYYMMDD <source-database>");
  }
  if (sourceDatabase === database) throw new Error("Target must be a new database, different from the source.");
  const sourceConnection = await mongoose.createConnection(uri, { dbName: sourceDatabase }).asPromise();
  try {
    const target = sourceConnection.getClient().db(database);
    const collections = await target.listCollections({}, { nameOnly: true }).toArray();
    for (const collection of collections) {
      if (await target.collection(collection.name).countDocuments({}, { limit: 1 })) {
        throw new Error("Target database contains data. Nothing was overwritten.");
      }
    }
    const skills = await sourceConnection.db.collection("skills").find({}).toArray();
    const admins = await sourceConnection.db.collection("users").find({ role: "Admin", isDemo: { $ne: true } }).toArray();
    if (!admins.length || !skills.length) throw new Error("Source needs an existing non-demo administrator and skill taxonomy.");
    await mongoose.connect(uri, { dbName: database });
    await Promise.all([User.init(), Skill.init(), Job.init()]);
    await Skill.insertMany(skills.map(({ _id, name, description, category }) => ({
      _id, name, description, category: name === "Translation" ? "Translation" : category,
    })));
    await User.insertMany(admins.map(({ _id, name, email, password, profilePhotoUrl }) => ({
      _id, name, email, password, role: "Admin", balance: 0, ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
    })));
    await mongoose.connection.db.collection("datasetmetadata").insertOne({
      _id: "sourced-marketplace-v1", createdAt: new Date(), preparedFrom: sourceDatabase,
      copied: { administrators: admins.length, skills: skills.length },
      policy: "No synthetic users, projects, proposals, contracts, reviews, interview results, balances or transactions. External listings link to their original source.",
    });
    console.log(JSON.stringify({ database, preparedFrom: sourceDatabase, adminsPreserved: admins.length, skills: skills.length, marketplaceRecords: 0, sourceUnchanged: true }));
  } finally {
    await mongoose.disconnect();
    await sourceConnection.close();
  }
}

if (require.main === module) prepareLiveDatabase().catch((error) => {
  // MongoDB connection failures may include connection details. Do not log URI.
  console.error(error.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, "[redacted connection]"));
  process.exitCode = 1;
});

module.exports = { prepareLiveDatabase };
