const mongoose = require("mongoose");
const User = require("../models/User");
const Job = require("../models/Job");
const { ALERT_CATEGORIES } = require("../services/jobAlertService");

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === value;

// GET /students/me/saved-jobs — saved jobs, newest save first.
const getSavedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("savedJobs").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const jobs = await Job.find({ _id: { $in: user.savedJobs } })
      .populate("employer", "name website companyLogoUrl isVerified")
      .populate("requiredSkills", "name category")
      .lean();
    const byId = new Map(jobs.map((job) => [String(job._id), job]));
    const ordered = [...user.savedJobs].reverse().map((id) => byId.get(String(id))).filter(Boolean);
    return res.status(200).json({ ids: user.savedJobs.map(String), jobs: ordered });
  } catch {
    return res.status(500).json({ message: "Error fetching saved jobs" });
  }
};

// PUT /students/me/saved-jobs/:jobId
const saveJob = async (req, res) => {
  const { jobId } = req.params;
  if (!isObjectId(jobId)) return res.status(400).json({ message: "Invalid job id" });
  try {
    if (!(await Job.exists({ _id: jobId }))) return res.status(404).json({ message: "Job not found" });
    await User.updateOne({ _id: req.user.id }, { $addToSet: { savedJobs: jobId } });
    return res.status(200).json({ saved: true, jobId });
  } catch {
    return res.status(500).json({ message: "Error saving job" });
  }
};

// DELETE /students/me/saved-jobs/:jobId
const unsaveJob = async (req, res) => {
  const { jobId } = req.params;
  if (!isObjectId(jobId)) return res.status(400).json({ message: "Invalid job id" });
  try {
    await User.updateOne({ _id: req.user.id }, { $pull: { savedJobs: jobId } });
    return res.status(200).json({ saved: false, jobId });
  } catch {
    return res.status(500).json({ message: "Error removing saved job" });
  }
};

// GET /students/me/job-alerts
const getJobAlerts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("jobAlerts").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const alerts = user.jobAlerts || {};
    return res.status(200).json({
      enabled: Boolean(alerts.enabled), categories: alerts.categories || [], keywords: alerts.keywords || [],
      availableCategories: ALERT_CATEGORIES,
    });
  } catch {
    return res.status(500).json({ message: "Error fetching job alerts" });
  }
};

// PUT /students/me/job-alerts { enabled, categories, keywords }
const updateJobAlerts = async (req, res) => {
  const { enabled, categories = [], keywords = [] } = req.body || {};
  if (!Array.isArray(categories) || !Array.isArray(keywords)) {
    return res.status(400).json({ message: "categories and keywords must be arrays" });
  }
  const cleanCategories = [...new Set(categories.filter((c) => ALERT_CATEGORIES.includes(c)))];
  const cleanKeywords = [...new Set(keywords
    .filter((k) => typeof k === "string").map((k) => k.trim().slice(0, 40)).filter(Boolean))].slice(0, 10);
  try {
    await User.updateOne({ _id: req.user.id }, { $set: {
      "jobAlerts.enabled": Boolean(enabled), "jobAlerts.categories": cleanCategories, "jobAlerts.keywords": cleanKeywords,
    } });
    return res.status(200).json({ enabled: Boolean(enabled), categories: cleanCategories, keywords: cleanKeywords, availableCategories: ALERT_CATEGORIES });
  } catch {
    return res.status(500).json({ message: "Error saving job alerts" });
  }
};

module.exports = { getSavedJobs, saveJob, unsaveJob, getJobAlerts, updateJobAlerts };
