const User = require("../models/User");
const Notification = require("../models/Notification");

const ALERT_CATEGORIES = ["Programming", "Design", "Business", "Engineering", "Media", "Translation", "Other"];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Categories a job belongs to: its own category plus its skills' categories. */
const jobCategories = (job) => {
  const fromSkills = (job.requiredSkills || []).map((skill) => skill && skill.category).filter(Boolean);
  return new Set([job.category, ...fromSkills].filter(Boolean));
};

const matchesAlert = (job, alerts) => {
  if (!alerts?.enabled) return false;
  const categories = alerts.categories || [];
  const keywords = alerts.keywords || [];
  if (!categories.length && !keywords.length) return false;
  const jobCats = jobCategories(job);
  const categoryHit = categories.some((category) => jobCats.has(category));
  const text = `${job.title || ""} ${(job.sourceTags || []).join(" ")}`;
  const keywordHit = keywords.some((keyword) => new RegExp(`\\b${escapeRegExp(keyword)}`, "i").test(text));
  return categoryHit || keywordHit;
};

/** One notification per matching student for a newly posted native job. */
const notifyNewJob = async (job) => {
  const students = await User.find({ role: "Student", "jobAlerts.enabled": true }).select("jobAlerts").lean();
  const docs = students.filter((student) => matchesAlert(job, student.jobAlerts)).map((student) => ({
    userId: student._id,
    title: "New job matches your alert",
    message: job.title,
    type: "job_alert",
    link: "/student/jobs?search=" + encodeURIComponent(job.title.slice(0, 60)),
  }));
  if (docs.length) await Notification.insertMany(docs);
  return docs.length;
};

/** A single digest per student after a bulk import, so alerts never spam. */
const notifyImportedJobs = async (jobs) => {
  if (!jobs.length) return 0;
  const students = await User.find({ role: "Student", "jobAlerts.enabled": true }).select("jobAlerts").lean();
  const docs = [];
  for (const student of students) {
    const count = jobs.filter((job) => matchesAlert(job, student.jobAlerts)).length;
    if (!count) continue;
    docs.push({
      userId: student._id,
      title: "New jobs match your alerts",
      message: `${count} new ${count === 1 ? "opportunity matches" : "opportunities match"} your job alerts.`,
      type: "job_alert",
      link: "/student/jobs",
    });
  }
  if (docs.length) await Notification.insertMany(docs);
  return docs.length;
};

module.exports = { ALERT_CATEGORIES, matchesAlert, notifyNewJob, notifyImportedJobs };
