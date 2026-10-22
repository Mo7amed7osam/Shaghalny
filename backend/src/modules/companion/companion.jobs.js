const Job = require("../../models/Job");
const Skill = require("../../models/Skill");
const Proposal = require("../../models/Proposal");
const { visibleJobConditions } = require("../../utils/jobVisibility");
const { studentHasRequiredVerifiedSkills } = require("../../utils/proposalEligibility");
const { isSourceUrl, isApplyUrl, plainText } = require("../../utils/externalJobs");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Titles that signal more experience than a typical student has.
const SENIOR_TITLE = /\b(senior|sr\.?|lead|principal|staff|head of|director|manager|architect|vp)\b/i;
const WORLDWIDE = /\b(worldwide|anywhere|global)\b/i;
const REMOTE = /\b(remote|anywhere)\b/i;

const MAX_RESULTS = 6;
const CANDIDATE_POOL = 60;

const idOf = (value) => String(value?._id || value || "");

const verifiedSkillIds = (student) =>
  new Set((student?.verifiedSkills || []).map((entry) => idOf(entry.skill)).filter(Boolean));

// Same rule the proposal endpoint enforces, applied to populated documents.
const meetsSkillGate = (job, verifiedIds) =>
  studentHasRequiredVerifiedSkills(
    { verifiedSkills: [...verifiedIds].map((skill) => ({ skill })) },
    { requiredSkills: (job.requiredSkills || []).map(idOf) },
  );

const appliedJobIds = async (studentId) => {
  const proposals = await Proposal.find({ studentId }).select("jobId").lean();
  return new Set(proposals.map((p) => idOf(p.jobId)));
};

const externalUrls = (job) => {
  if (job.sourceType !== "external") return { listingUrl: null, applyUrl: null };
  const listingUrl = isSourceUrl(job.sourceUrl, job.sourceName) ? job.sourceUrl : null;
  if (!listingUrl) return { listingUrl: null, applyUrl: null };
  return { listingUrl, applyUrl: isApplyUrl(job.sourceApplyUrl) ? job.sourceApplyUrl : listingUrl };
};

const budgetOf = (job) => {
  if (job.sourceType === "external") {
    return job.sourceCompensation ? { text: String(job.sourceCompensation).slice(0, 120) } : null;
  }
  if (job.isUnpaid) return { unpaid: true };
  const min = Number.isFinite(job.budgetMin) ? job.budgetMin : null;
  const max = Number.isFinite(job.budgetMax) ? job.budgetMax : null;
  if (min === null && max === null) return null;
  return { min, max, currency: "EGP" };
};

const locationOf = (job) => {
  if (job.sourceType === "external") return job.sourceLocation ? String(job.sourceLocation).slice(0, 160) : null;
  return job.location ? String(job.location).slice(0, 160) : null;
};

/**
 * Builds the card the companion renders. Every field comes from the stored job
 * and the student's own profile; reasons and cautions are rule-based codes the
 * frontend localizes, never model output.
 */
const toJobCard = (job, { verifiedIds, appliedIds }) => {
  const id = idOf(job);
  const isExternal = job.sourceType === "external";
  const requiredSkills = (job.requiredSkills || [])
    .filter((skill) => skill && skill.name)
    .map((skill) => ({ name: skill.name, verified: verifiedIds.has(idOf(skill)) }));
  const missing = requiredSkills.filter((s) => !s.verified).map((s) => s.name);
  const matched = requiredSkills.filter((s) => s.verified).map((s) => s.name);
  const alreadyApplied = !isExternal && appliedIds.has(id);
  const location = locationOf(job);
  const { listingUrl, applyUrl } = externalUrls(job);

  const reasons = [];
  if (matched.length) reasons.push({ code: "verified_match", skills: matched });
  if (!isExternal && requiredSkills.length && !missing.length) reasons.push({ code: "eligible" });
  if (job.type === "internship") reasons.push({ code: "internship" });

  const cautions = [];
  if (missing.length) cautions.push({ code: isExternal ? "unverified_listed" : "missing_verified", skills: missing });
  if (SENIOR_TITLE.test(job.title || "")) cautions.push({ code: "senior_role" });
  if (isExternal) cautions.push({ code: "external_apply", source: job.sourceName });
  if (isExternal && REMOTE.test(location || "") && !WORLDWIDE.test(location || "")) {
    cautions.push({ code: "remote_restrictions" });
  }
  if (isExternal && !location) cautions.push({ code: "location_unknown" });
  if (alreadyApplied) cautions.push({ code: "already_applied" });
  if (job.isUnpaid) cautions.push({ code: "unpaid" });

  return {
    id,
    title: String(job.title || "").slice(0, 160),
    company: isExternal ? job.sourceCompanyName || null : job.employer?.name || null,
    companyVerified: !isExternal && Boolean(job.employer?.isVerified),
    sourceType: isExternal ? "external" : "internal",
    sourceName: isExternal ? job.sourceName || null : null,
    type: job.type || null,
    workMode: job.workMode || null,
    location,
    duration: job.duration ? String(job.duration).slice(0, 80) : null,
    budget: budgetOf(job),
    requiredSkills,
    missingVerifiedSkills: missing,
    alreadyApplied,
    canApply: !isExternal && !alreadyApplied && job.status === "open" && meetsSkillGate(job, verifiedIds),
    listingUrl,
    applyUrl,
    reasons,
    cautions,
  };
};

const populateJob = (query) =>
  query
    .populate("employer", "name isVerified")
    .populate("requiredSkills", "name category");

// Match free-text terms against titles, descriptions, tags and skill names.
const termConditions = async (query) => {
  const terms = String(query || "")
    .toLowerCase()
    .split(/[\s,;/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  if (!terms.length) return { terms, conditions: [] };
  const regexes = terms.map((t) => new RegExp(escapeRegExp(t), "i"));
  const skills = await Skill.find({ name: { $in: regexes } }).select("_id").lean();
  const conditions = [
    ...regexes.flatMap((re) => [
      { title: re },
      { description: re },
      { sourceTags: re },
      { sourceCompanyName: re },
    ]),
    ...(skills.length ? [{ requiredSkills: { $in: skills.map((s) => s._id) } }] : []),
  ];
  return { terms, conditions };
};

const relevance = (job, terms, verifiedIds, appliedIds) => {
  const title = String(job.title || "").toLowerCase();
  const skillNames = (job.requiredSkills || []).map((s) => String(s?.name || "").toLowerCase());
  const tags = (job.sourceTags || []).map((t) => String(t).toLowerCase());
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 3;
    if (skillNames.some((n) => n.includes(term))) score += 3;
    if (tags.some((t) => t.includes(term))) score += 2;
  }
  score += (job.requiredSkills || []).filter((s) => verifiedIds.has(idOf(s))).length * 2;
  if (job.sourceType !== "external") {
    score += 1;
    if (meetsSkillGate(job, verifiedIds)) score += 2;
    if (appliedIds.has(idOf(job))) score -= 4;
  }
  if (SENIOR_TITLE.test(job.title || "")) score -= 2;
  return score;
};

/**
 * Search open, publicly visible jobs for the authenticated student. Without a
 * query it falls back to the student's verified skills.
 */
const searchJobsForStudent = async (student, { query, type, workMode, source = "any", limit = 5 } = {}) => {
  const verifiedIds = verifiedSkillIds(student);
  const appliedIds = await appliedJobIds(student._id);
  const { terms, conditions } = await termConditions(query);

  const and = [...visibleJobConditions()];
  if (type) and.push({ type });
  if (workMode) and.push({ workMode });
  if (source === "internal") and.push({ sourceType: { $ne: "external" } });
  if (source === "external") and.push({ sourceType: "external" });
  if (conditions.length) {
    and.push({ $or: conditions });
  } else if (verifiedIds.size) {
    and.push({ requiredSkills: { $in: [...verifiedIds] } });
  }

  const jobs = await populateJob(Job.find({ $and: and }))
    .sort({ createdAt: -1, _id: -1 })
    .limit(CANDIDATE_POOL);

  const ranked = jobs
    .map((job) => ({ job, score: relevance(job, terms, verifiedIds, appliedIds) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(Number(limit) || 5, 1), MAX_RESULTS));

  return {
    usedQuery: terms.join(" ") || null,
    usedVerifiedSkills: !conditions.length && verifiedIds.size > 0,
    totalCandidates: jobs.length,
    jobs: ranked.map(({ job }) => toJobCard(job, { verifiedIds, appliedIds })),
  };
};

/** One visible job plus a trimmed plain-text description, or null. */
const getJobForStudent = async (student, jobId) => {
  const job = await populateJob(Job.findOne({ $and: [{ _id: jobId }, ...visibleJobConditions()] }));
  if (!job) return null;
  const verifiedIds = verifiedSkillIds(student);
  const appliedIds = await appliedJobIds(student._id);
  return {
    card: toJobCard(job, { verifiedIds, appliedIds }),
    description: plainText(job.description).slice(0, 1500),
    eligibleToApply: job.sourceType !== "external" && meetsSkillGate(job, verifiedIds),
  };
};

module.exports = {
  searchJobsForStudent,
  getJobForStudent,
  toJobCard,
  SENIOR_TITLE,
};
