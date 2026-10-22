const Job = require("../models/Job");
const isValidObjectId = (value) =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
const Proposal = require("../models/Proposal");
const User = require("../models/User");
const Skill = require("../models/Skill");
const Contract = require("../models/Contract");
const { acceptProposalWithEscrow } = require("../services/contractService");
const { paymentsEnabled, PAYMENTS_DISABLED_MESSAGE } = require("../middleware/payments");
const { notifyNewJob } = require("../services/jobAlertService");
const {
  matchStudentsToJob,
  notifyMatchedStudents,
} = require("../services/matchingService");
const {
  studentHasRequiredVerifiedSkills,
} = require("../utils/proposalEligibility");
const { visibleJobConditions } = require("../utils/jobVisibility");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST /jobs - Create a new job
const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      requiredSkills,
      budgetMin,
      budgetMax,
      duration,
      type,
      workMode,
      positions,
      isUnpaid,
    } = req.body;
    const jobType = type === "internship" ? "internship" : "freelance";
    const normalizedWorkMode = ["online", "onsite", "hybrid"].includes(workMode)
      ? workMode
      : undefined;
    const parsedPositions =
      jobType === "internship" ? Math.max(1, parseInt(positions, 10) || 1) : 1;
    const unpaidInternship = jobType === "internship" && isUnpaid === true;
    if (!unpaidInternship && !paymentsEnabled()) {
      return res.status(503).json({ message: PAYMENTS_DISABLED_MESSAGE, code: "PAYMENTS_DISABLED" });
    }
    const parsedBudgetMin = unpaidInternship
      ? undefined
      : budgetMin !== undefined
        ? Number(budgetMin)
        : undefined;
    const parsedBudgetMax = unpaidInternship
      ? undefined
      : budgetMax !== undefined
        ? Number(budgetMax)
        : undefined;
    if (
      parsedBudgetMin !== undefined &&
      (!Number.isFinite(parsedBudgetMin) || parsedBudgetMin < 0)
    ) {
      return res
        .status(400)
        .json({ message: "budgetMin must be a non-negative number." });
    }
    if (
      parsedBudgetMax !== undefined &&
      (!Number.isFinite(parsedBudgetMax) || parsedBudgetMax < 0)
    ) {
      return res
        .status(400)
        .json({ message: "budgetMax must be a non-negative number." });
    }
    if (
      parsedBudgetMin !== undefined &&
      parsedBudgetMax !== undefined &&
      parsedBudgetMin > parsedBudgetMax
    ) {
      return res
        .status(400)
        .json({ message: "budgetMin cannot exceed budgetMax." });
    }
    const newJob = new Job({
      isDemo: process.env.DEMO_MODE === "true",
      title,
      description,
      requiredSkills,
      employer: req.user?.id,
      budgetMin: parsedBudgetMin,
      budgetMax: parsedBudgetMax,
      duration,
      type: jobType,
      workMode: normalizedWorkMode,
      positions: parsedPositions,
      isUnpaid: unpaidInternship,
    });
    await newJob.save();

    try {
      const matchedStudents = await matchStudentsToJob(newJob._id.toString());
      await notifyMatchedStudents(matchedStudents, newJob.title);
    } catch (matchError) {
      const message =
        matchError && matchError.message ? matchError.message : "Unknown error";
      console.warn("Matching service error:", message);
    }

    const populatedJob = await Job.findById(newJob._id)
      .populate("employer", "name email website companyLogoUrl isVerified")
      .populate("requiredSkills", "name category");
    // Job alerts are best-effort; a failure must not fail job creation.
    notifyNewJob(populatedJob.toObject()).catch((alertError) =>
      console.warn("Job alert error:", alertError?.message || "Unknown error"));
    res.status(201).json(populatedJob);
  } catch (error) {
    res.status(500).json({ message: "Error creating job", error });
  }
};

// GET /jobs - Retrieve all jobs
const getJobs = async (req, res) => {
  try {
    const { search, skills, minBudget, maxBudget, duration, type } = req.query;
    const query = { status: "open" };

    if (type === "internship" || type === "freelance") {
      query.type = type;
    }

    if (typeof search === "string") {
      const searchTerm = search.trim().slice(0, 100);
      if (searchTerm) {
        const searchRegex = new RegExp(escapeRegExp(searchTerm), "i");
        const [matchedSkills, matchedEmployers] = await Promise.all([
          Skill.find({ name: searchRegex }).select("_id"),
          User.find({
            role: "Client",
            $or: [
              { name: searchRegex },
              { email: searchRegex },
              { website: searchRegex },
            ],
          }).select("_id"),
        ]);

        query.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { sourceCompanyName: searchRegex },
          { sourceLocation: searchRegex },
          { duration: searchRegex },
          ...(matchedSkills.length
            ? [
                {
                  requiredSkills: {
                    $in: matchedSkills.map((skill) => skill._id),
                  },
                },
              ]
            : []),
          ...(matchedEmployers.length
            ? [
                {
                  employer: {
                    $in: matchedEmployers.map((employer) => employer._id),
                  },
                },
              ]
            : []),
        ];
      }
    }

    if (typeof duration === "string") {
      const durationTerm = duration.trim().slice(0, 100);

      if (durationTerm) {
        query.duration = {
          $regex: escapeRegExp(durationTerm),
          $options: "i",
        };
      }
    }

    if (typeof minBudget === "string") {
      const minVal = Number(minBudget);
      if (Number.isFinite(minVal)) {
        query.budgetMax = { ...(query.budgetMax || {}), $gte: minVal };
      }
    }

    if (typeof maxBudget === "string") {
      const maxVal = Number(maxBudget);
      if (Number.isFinite(maxVal)) {
        query.budgetMin = { ...(query.budgetMin || {}), $lte: maxVal };
      }
    }

    if (typeof skills === "string" || Array.isArray(skills)) {
      const rawSkills = Array.isArray(skills) ? skills : skills.split(",");
      const normalized = rawSkills
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);
      const skillIds = normalized.filter((value) =>
        /^[a-fA-F0-9]{24}$/.test(value),
      );
      const skillNames = normalized.filter(
        (value) => !/^[a-fA-F0-9]{24}$/.test(value),
      );
      if (skillNames.length) {
        const matched = await Skill.find({
          name: {
            $in: skillNames.map(
              (name) => new RegExp(`^${escapeRegExp(name)}$`, "i"),
            ),
          },
        }).select("_id");
        skillIds.push(...matched.map((skill) => skill._id.toString()));
      }
      if (skillIds.length) {
        query.requiredSkills = { $in: skillIds };
      }
    }

    const jobs = await Job.find({
      $and: [
        ...visibleJobConditions(),
        ...(query.type ? [{ type: query.type }] : []),
        ...(query.$or ? [{ $or: query.$or }] : []),
        ...(query.duration ? [{ duration: query.duration }] : []),
        ...(query.budgetMax ? [{ budgetMax: query.budgetMax }] : []),
        ...(query.budgetMin ? [{ budgetMin: query.budgetMin }] : []),
        ...(query.requiredSkills
          ? [{ requiredSkills: query.requiredSkills }]
          : []),
      ],
    })
      .populate("employer", "name website companyLogoUrl isVerified")
      .populate("requiredSkills", "name category")
      .sort({ createdAt: -1, _id: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching jobs", error });
  }
};

// GET /jobs/mine - Retrieve jobs for the current client
const getClientJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user?.id })
      .populate("requiredSkills", "name category")
      .populate("selectedStudent", "name email profilePhotoUrl")
      .populate("employer", "name website companyLogoUrl isVerified");
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching client jobs", error });
  }
};

// POST /jobs/:id/proposals - Submit a proposal for a job
const submitProposal = async (req, res) => {
  try {
    const jobId = req.params.id || req.body.jobId;
    const { details, proposedBudget } = req.body;

    if (!isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.sourceType === "external") {
      return res.status(409).json({
        message: "Apply at the original listing. External employers do not receive Shaghalny proposals or contracts.",
        sourceUrl: job.sourceUrl,
      });
    }
    if (job.status !== "open") {
      return res.status(400).json({ message: "Job is not open for proposals" });
    }

    const existing = await Proposal.findOne({ jobId, studentId: req.user?.id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You already submitted a proposal for this job." });
    }

    const student = await User.findById(req.user?.id).select("verifiedSkills");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    if (!studentHasRequiredVerifiedSkills(student, job)) {
      return res.status(403).json({
        message:
          "You can only apply to jobs when all required skills are verified on your profile.",
      });
    }

    const parsedBudget =
      proposedBudget !== undefined ? Number(proposedBudget) : undefined;
    if (
      parsedBudget !== undefined &&
      (!Number.isFinite(parsedBudget) || parsedBudget < 0)
    ) {
      return res
        .status(400)
        .json({ message: "proposedBudget must be a non-negative number." });
    }

    const newProposal = new Proposal({
      jobId,
      studentId: req.user?.id,
      details,
      proposedBudget: parsedBudget,
      status: "submitted",
    });
    await newProposal.save();

    if (req.user?.id) {
      job.applicants.push(req.user.id);
    }
    await job.save();

    res.status(201).json(newProposal);
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(400)
        .json({ message: "You already submitted a proposal for this job." });
    }
    res.status(500).json({ message: "Error submitting proposal", error });
  }
};

// GET /jobs/:id/proposals - Get proposals for a specific job
const getJobProposals = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.sourceType === "external") {
      return res.status(409).json({
        message: "Apply at the original listing. External employers do not receive Shaghalny proposals or contracts.",
        sourceUrl: job.sourceUrl,
      });
    }
    if (job.employer.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to view proposals for this job" });
    }
    const proposals = await Proposal.find({ jobId: req.params.id })
      .populate({
        path: "studentId",
        select: "name email profilePhotoUrl verifiedSkills",
        populate: { path: "verifiedSkills.skill", select: "name" },
      })
      .populate(
        "jobId",
        "title status activeContract type isUnpaid budgetMin budgetMax positions positionsFilled",
      );
    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: "Error fetching proposals", error });
  }
};

// GET /jobs/:id/matches - Get matched students for a job
const getMatchedCandidates = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.sourceType === "external") {
      return res.status(409).json({
        message: "Apply at the original listing. External employers do not receive Shaghalny proposals or contracts.",
        sourceUrl: job.sourceUrl,
      });
    }
    if (job.employer.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to view matches for this job" });
    }
    const students = await matchStudentsToJob(req.params.id);
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: "Error matching students", error });
  }
};

// POST /jobs/:id/select - Select a student for a job
const selectStudentForJob = async (req, res) => {
  try {
    const { studentId } = req.body;
    const jobId = req.params.id;

    if (!isValidObjectId(jobId) || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: "Invalid job or student ID." });
    }

    const proposal = await Proposal.findOne({
      jobId,
      studentId,
      status: { $in: ["submitted", "shortlisted", "pending"] },
    });
    if (!proposal) {
      return res
        .status(404)
        .json({ message: "Proposal not found for this student." });
    }
    const agreedBudget = req.body?.agreedBudget;
    const result = await acceptProposalWithEscrow({
      proposalId: proposal._id,
      clientId: req.user?.id,
      agreedBudget,
    });
    res.status(200).json(result);
  } catch (error) {
    const status = error?.status || 500;
    res
      .status(status)
      .json({ message: error?.message || "Error selecting student", error });
  }
};

// GET /jobs/proposals/client - Get proposals across client jobs
const getClientProposals = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user?.id }).select("_id");
    const jobIds = jobs.map((job) => job._id);
    const proposals = await Proposal.find({ jobId: { $in: jobIds } })
      .populate({
        path: "studentId",
        select: "name email profilePhotoUrl verifiedSkills",
        populate: { path: "verifiedSkills.skill", select: "name" },
      })
      .populate("jobId", "title status activeContract");
    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: "Error fetching proposals", error });
  }
};

// POST /jobs/:id/reviews - Submit a review for the selected student
const submitJobReview = async (req, res) => {
  try {
    const { studentId, rating, comment } = req.body;
    const jobId = req.params.id;

    if (!isValidObjectId(jobId) || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: "Invalid job or student ID." });
    }
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required." });
    }

    const ratingValue = Number(rating);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be a number from 1 to 5." });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.sourceType === "external") {
      return res.status(409).json({
        message: "Apply at the original listing. External employers do not receive Shaghalny proposals or contracts.",
        sourceUrl: job.sourceUrl,
      });
    }
    if (job.employer.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to review this job" });
    }

    const contract = await Contract.findOne({ jobId, studentId });
    if (!contract) {
      return res
        .status(404)
        .json({ message: "Contract not found for this job." });
    }
    if (
      contract.status !== "completed" ||
      contract.escrowStatus !== "released"
    ) {
      return res
        .status(400)
        .json({ message: "Job must be completed before review." });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const hasReview = (student.reviews || []).some(
      (review) => review.contractId?.toString() === contract._id.toString(),
    );
    if (hasReview) {
      return res
        .status(400)
        .json({ message: "Review already submitted for this job." });
    }

    const client = await User.findById(req.user?.id).select("name");
    const review = {
      jobId: job._id,
      contractId: contract._id,
      jobTitle: job.title,
      jobType: job.type,
      clientName: client?.name || "Client",
      rating: ratingValue,
      comment,
    };

    student.reviews = student.reviews || [];
    student.reviews.push(review);
    student.jobsCompleted = Math.max(
      student.jobsCompleted || 0,
      student.reviews.length,
    );
    await student.save();

    res.status(201).json({
      message: "Review submitted successfully",
      review,
      jobsCompleted: student.jobsCompleted,
    });
  } catch (error) {
    res.status(500).json({ message: "Error submitting review", error });
  }
};

// GET /jobs/:id - Get a single job
const getJobById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(req.params.id)
      .populate("employer", "name email website companyLogoUrl isVerified")
      .populate("requiredSkills", "name category")
      .populate("selectedStudent", "name email profilePhotoUrl");
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: "Error fetching job", error });
  }
};

// PATCH /jobs/:id - Update a job owned by the client
const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    if (!isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const existingJob = await Job.findById(jobId);

    if (!existingJob) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (existingJob.sourceType === "external") {
      return res.status(409).json({
        message: "Apply at the original listing. External employers do not receive Shaghalny proposals or contracts.",
        sourceUrl: existingJob.sourceUrl,
      });
    }
    if (existingJob.employer.toString() !== req.user?.id) {
      return res.status(403).json({
        message: "You are not authorized to edit this job.",
      });
    }

    if (
      existingJob.activeContract ||
      ["in_progress", "completed", "closed"].includes(existingJob.status)
    ) {
      return res.status(400).json({
        message:
          "This job cannot be edited after a contract has started or the job is closed.",
      });
    }

    const {
      title,
      description,
      requiredSkills,
      budgetMin,
      budgetMax,
      duration,
      type,
      workMode,
      positions,
      isUnpaid,
    } = req.body;

    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      typeof description !== "string" ||
      description.trim().length < 20
    ) {
      return res.status(400).json({
        message:
          "Title must be at least 3 characters and description at least 20 characters.",
      });
    }

    if (
      !Array.isArray(requiredSkills) ||
      requiredSkills.length === 0 ||
      !requiredSkills.every(isValidObjectId)
    ) {
      return res.status(400).json({
        message: "At least one valid required skill is needed.",
      });
    }

    const jobType = type === "internship" ? "internship" : "freelance";
    const unpaid = jobType === "internship" && isUnpaid === true;
    if (!unpaid && !paymentsEnabled()) {
      return res.status(503).json({ message: PAYMENTS_DISABLED_MESSAGE, code: "PAYMENTS_DISABLED" });
    }

    // Budgets are optional, matching createJob; validate only what is provided.
    const parseBudget = (value) =>
      unpaid || value === undefined || value === null || value === ""
        ? undefined
        : Number(value);
    const min = parseBudget(budgetMin);
    const max = parseBudget(budgetMax);

    if (
      (min !== undefined && (!Number.isFinite(min) || min < 0)) ||
      (max !== undefined && (!Number.isFinite(max) || max < 0)) ||
      (min !== undefined && max !== undefined && min > max)
    ) {
      return res.status(400).json({
        message: "Please provide valid minimum and maximum budgets.",
      });
    }

    // null or "" clears the work mode; an omitted key leaves it unchanged.
    const hasWorkMode = Object.prototype.hasOwnProperty.call(
      req.body,
      "workMode",
    );
    const clearWorkMode =
      hasWorkMode && (workMode === null || workMode === "");
    if (
      hasWorkMode &&
      !clearWorkMode &&
      !["online", "onsite", "hybrid"].includes(workMode)
    ) {
      return res.status(400).json({
        message: "Invalid work mode.",
      });
    }

    const uniqueSkills = [...new Set(requiredSkills.map(String))];
    const skillsExist = await Skill.countDocuments({
      _id: { $in: uniqueSkills },
    });

    if (skillsExist !== uniqueSkills.length) {
      return res.status(400).json({
        message: "One or more selected skills do not exist.",
      });
    }

    const $set = {
      title: title.trim(),
      description: description.trim(),
      requiredSkills: uniqueSkills,
      duration: typeof duration === "string" ? duration.trim() : "",
      type: jobType,
      isUnpaid: unpaid,
      positions:
        jobType === "internship" ? Math.max(1, Number(positions) || 1) : 1,
    };
    const $unset = {};
    if (min === undefined) $unset.budgetMin = "";
    else $set.budgetMin = min;
    if (max === undefined) $unset.budgetMax = "";
    else $set.budgetMax = max;
    if (clearWorkMode) $unset.workMode = "";
    else if (hasWorkMode) $set.workMode = workMode;

    // Re-check editability in the write itself so a proposal accepted while
    // this request was validating cannot be overwritten.
    const job = await Job.findOneAndUpdate(
      {
        _id: jobId,
        employer: req.user?.id,
        activeContract: null,
        status: "open",
      },
      Object.keys($unset).length ? { $set, $unset } : { $set },
      { new: true, runValidators: true },
    );

    if (!job) {
      return res.status(409).json({
        message:
          "This job can no longer be edited because a contract has started or the job is closed.",
      });
    }

    const updatedJob = await Job.findById(job._id)
      .populate("requiredSkills", "name category")
      .populate("employer", "name email website companyLogoUrl isVerified");

    return res.status(200).json({
      message: "Job updated successfully.",
      job: updatedJob,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating job.",
      error: error.message,
    });
  }
};

module.exports = {
  createJob,
  updateJob,
  getJobs,
  getJobById,
  getClientJobs,
  submitProposal,
  getJobProposals,
  getMatchedCandidates,
  selectStudentForJob,
  getClientProposals,
  submitJobReview,
};
