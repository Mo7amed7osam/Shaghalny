const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const Job = require("../models/Job");
const Skill = require("../models/Skill");
const { NORMALIZERS, dedupeJobs } = require("../utils/externalJobs");
const { linkPasses } = require("./fetchExternalJobs");
const { notifyImportedJobs } = require("../services/jobAlertService");

async function importExternalJobs() {
  const [database, snapshotFile] = process.argv.slice(2);
  if (!/^Shaghalny-(?:Live|Demo)-\d{8}$/.test(database || "") || !snapshotFile) {
    throw new Error("Usage: node src/scripts/importExternalJobs.js Shaghalny-Live-YYYYMMDD <snapshot.json>");
  }
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
  const fetchedAt = new Date(snapshot.fetchedAt);
  const age = Date.now() - fetchedAt.getTime();
  if (snapshot.version !== 2 || !snapshot.raw || !snapshot.linkChecks
    || !Number.isFinite(age) || age < 0 || age > 86400000) {
    throw new Error("Snapshot must be a version 2 multi-source snapshot fetched within the last 24 hours.");
  }
  // Revalidate on import: re-normalize the raw source records; never trust normalized JSON.
  const candidates = [];
  for (const [sourceName, records] of Object.entries(snapshot.raw)) {
    const normalize = NORMALIZERS[sourceName];
    if (!normalize || !Array.isArray(records)) throw new Error(`Unsupported source in snapshot: ${sourceName}`);
    for (const record of records) {
      const job = normalize(record, fetchedAt);
      if (!job) continue;
      const check = snapshot.linkChecks[`${sourceName}#${job.sourceId}`];
      if (!linkPasses(check)) continue;
      job.sourceLinkCheckedAt = new Date(check.checkedAt);
      if (Number.isInteger(check.status)) job.sourceLinkStatus = check.status;
      candidates.push(job);
    }
  }
  const { kept: jobs } = dedupeJobs(candidates);
  if (!jobs.length) throw new Error("Snapshot has no importable listings. No database writes were attempted.");
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is not set.");
  await mongoose.connect(uri, { dbName: database });
  try {
    const skills = await Skill.find().lean();
    if (!skills.length) throw new Error("Initialize the new database first; skill taxonomy is missing.");
    await Job.init();
    const writes = [];
    for (const job of jobs) {
      // Only exact skill names present in source title/tags are mapped.
      const sourceText = ` ${[job.title, ...job.sourceTags].join(" ").toLowerCase()} `;
      const requiredSkills = skills.filter((skill) => {
        const name = skill.name.toLowerCase();
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(sourceText);
      }).map((skill) => skill._id);
      const update = { ...job, requiredSkills };
      await new Job(update).validate();
      writes.push({ updateOne: {
        filter: { sourceType: "external", sourceName: job.sourceName, sourceId: job.sourceId },
        update: { $set: update, $setOnInsert: { createdAt: job.sourcePublishedAt } }, upsert: true,
      } });
    }
    const result = await Job.bulkWrite(writes, { ordered: true });
    // upsertedIds is keyed by write index, and writes follow the jobs order.
    const newJobs = Object.keys(result.upsertedIds || {}).map((index) => jobs[Number(index)]).filter(Boolean);
    const alertsSent = await notifyImportedJobs(newJobs);
    const bySource = {}; const byCategory = {};
    for (const job of jobs) {
      bySource[job.sourceName] = (bySource[job.sourceName] || 0) + 1;
      byCategory[job.category] = byCategory[job.category] || { freelance: 0, internship: 0 };
      byCategory[job.category][job.type] += 1;
    }
    console.log(JSON.stringify({ database, snapshotFetchedAt: fetchedAt, matched: result.matchedCount, inserted: result.upsertedCount, alertsSent, modified: result.modifiedCount, listings: jobs.length, bySource, byCategory }, null, 2));
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) importExternalJobs().catch((error) => {
  console.error(error.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, "[redacted connection]"));
  process.exitCode = 1;
});

module.exports = { importExternalJobs };
