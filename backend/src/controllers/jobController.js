const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Contract = require('../models/Contract');
const { acceptProposalWithEscrow } = require('../services/contractService');
const { matchStudentsToJob, notifyMatchedStudents } = require('../services/matchingService');
const { studentHasRequiredVerifiedSkills } = require('../utils/proposalEligibility');

// POST /jobs - Create a new job
const createJob = async (req, res) => {
    try {
        const { title, description, requiredSkills, budgetMin, budgetMax, duration } = req.body;
        const parsedBudgetMin = budgetMin !== undefined ? Number(budgetMin) : undefined;
        const parsedBudgetMax = budgetMax !== undefined ? Number(budgetMax) : undefined;
        if (parsedBudgetMin !== undefined && (!Number.isFinite(parsedBudgetMin) || parsedBudgetMin < 0)) {
            return res.status(400).json({ message: 'budgetMin must be a non-negative number.' });
        }
        if (parsedBudgetMax !== undefined && (!Number.isFinite(parsedBudgetMax) || parsedBudgetMax < 0)) {
            return res.status(400).json({ message: 'budgetMax must be a non-negative number.' });
        }
        if (
            parsedBudgetMin !== undefined &&
            parsedBudgetMax !== undefined &&
            parsedBudgetMin > parsedBudgetMax
        ) {
            return res.status(400).json({ message: 'budgetMin cannot exceed budgetMax.' });
        }
        const newJob = new Job({
            title,
            description,
            requiredSkills,
            employer: req.user?.id,
            budgetMin: parsedBudgetMin,
            budgetMax: parsedBudgetMax,
            duration,
        });
        await newJob.save();

        try {
            const matchedStudents = await matchStudentsToJob(newJob._id.toString());
            await notifyMatchedStudents(matchedStudents, newJob.title);
        } catch (matchError) {
            const message = matchError && matchError.message ? matchError.message : 'Unknown error';
            console.warn('Matching service error:', message);
        }

        const populatedJob = await Job.findById(newJob._id)
            .populate('employer', 'name email')
            .populate('requiredSkills', 'name');
        res.status(201).json(populatedJob);
    } catch (error) {
        res.status(500).json({ message: 'Error creating job', error });
    }
};

// GET /jobs - Retrieve all jobs
const getJobs = async (req, res) => {
    try {
        const { search, skills, minBudget, maxBudget, duration } = req.query;
        const query = { status: 'open' };

        if (search) {
            query.$text = { $search: search.toString() };
        }

        if (duration) {
            query.duration = { $regex: duration.toString(), $options: 'i' };
        }

        if (minBudget !== undefined) {
            const minVal = Number(minBudget);
            if (!Number.isNaN(minVal)) {
                query.budgetMax = { ...(query.budgetMax || {}), $gte: minVal };
            }
        }

        if (maxBudget !== undefined) {
            const maxVal = Number(maxBudget);
            if (!Number.isNaN(maxVal)) {
                query.budgetMin = { ...(query.budgetMin || {}), $lte: maxVal };
            }
        }

        if (skills) {
            const rawSkills = Array.isArray(skills) ? skills : skills.toString().split(',');
            const normalized = rawSkills.map((value) => value.toString().trim()).filter(Boolean);
            const skillIds = normalized.filter((value) => /^[a-fA-F0-9]{24}$/.test(value));
            const skillNames = normalized.filter((value) => !/^[a-fA-F0-9]{24}$/.test(value));
            if (skillNames.length) {
                const matched = await Skill.find({
                    name: { $in: skillNames.map((name) => new RegExp(`^${name}$`, 'i')) },
                }).select('_id');
                skillIds.push(...matched.map((skill) => skill._id.toString()));
            }
            if (skillIds.length) {
                query.requiredSkills = { $in: skillIds };
            }
        }

        const jobs = await Job.find(query)
            .populate('employer', 'name')
            .populate('requiredSkills', 'name');
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching jobs', error });
    }
};

// GET /jobs/mine - Retrieve jobs for the current client
const getClientJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ employer: req.user?.id })
            .populate('requiredSkills', 'name')
            .populate('selectedStudent', 'name email');
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching client jobs', error });
    }
};

// POST /jobs/:id/proposals - Submit a proposal for a job
const submitProposal = async (req, res) => {
    try {
        const jobId = req.params.id || req.body.jobId;
        const { details, proposedBudget } = req.body;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        if (job.status !== 'open') {
            return res.status(400).json({ message: 'Job is not open for proposals' });
        }

        const existing = await Proposal.findOne({ jobId, studentId: req.user?.id });
        if (existing) {
            return res.status(400).json({ message: 'You already submitted a proposal for this job.' });
        }

        const student = await User.findById(req.user?.id).select('verifiedSkills');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        if (!studentHasRequiredVerifiedSkills(student, job)) {
            return res.status(403).json({
                message: 'You can only apply to jobs when all required skills are verified on your profile.',
            });
        }

        const parsedBudget = proposedBudget !== undefined ? Number(proposedBudget) : undefined;
        if (parsedBudget !== undefined && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
            return res.status(400).json({ message: 'proposedBudget must be a non-negative number.' });
        }

        const newProposal = new Proposal({
            jobId,
            studentId: req.user?.id,
            details,
            proposedBudget: parsedBudget,
            status: 'submitted',
        });
        await newProposal.save();

        if (req.user?.id) {
            job.applicants.push(req.user.id);
        }
        await job.save();

        res.status(201).json(newProposal);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(400).json({ message: 'You already submitted a proposal for this job.' });
        }
        res.status(500).json({ message: 'Error submitting proposal', error });
    }
};

// GET /jobs/:id/proposals - Get proposals for a specific job
const getJobProposals = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        if (job.employer.toString() !== req.user?.id) {
            return res.status(403).json({ message: 'Not authorized to view proposals for this job' });
        }
        const proposals = await Proposal.find({ jobId: req.params.id })
            .populate({
                path: 'studentId',
                select: 'name email verifiedSkills',
                populate: { path: 'verifiedSkills.skill', select: 'name' },
            })
            .populate('jobId', 'title status activeContract');
        res.status(200).json(proposals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching proposals', error });
    }
};

// GET /jobs/:id/matches - Get matched students for a job
const getMatchedCandidates = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        if (job.employer.toString() !== req.user?.id) {
            return res.status(403).json({ message: 'Not authorized to view matches for this job' });
        }
        const students = await matchStudentsToJob(req.params.id);
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error matching students', error });
    }
};

// POST /jobs/:id/select - Select a student for a job
const selectStudentForJob = async (req, res) => {
    try {
        const { studentId } = req.body;
        const jobId = req.params.id;
        const proposal = await Proposal.findOne({ jobId, studentId, status: { $in: ['submitted', 'shortlisted', 'pending'] } });
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found for this student.' });
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
        res.status(status).json({ message: error?.message || 'Error selecting student', error });
    }
};

// GET /jobs/proposals/client - Get proposals across client jobs
const getClientProposals = async (req, res) => {
    try {
        const jobs = await Job.find({ employer: req.user?.id }).select('_id');
        const jobIds = jobs.map(job => job._id);
        const proposals = await Proposal.find({ jobId: { $in: jobIds } })
            .populate({
                path: 'studentId',
                select: 'name email verifiedSkills',
                populate: { path: 'verifiedSkills.skill', select: 'name' },
            })
            .populate('jobId', 'title status activeContract');
        res.status(200).json(proposals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching proposals', error });
    }
};

// POST /jobs/:id/reviews - Submit a review for the selected student
const submitJobReview = async (req, res) => {
    try {
        const { studentId, rating, comment } = req.body;
        const jobId = req.params.id;

        if (!studentId) {
            return res.status(400).json({ message: 'studentId is required.' });
        }

        const ratingValue = Number(rating);
        if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({ message: 'Rating must be a number from 1 to 5.' });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        if (job.employer.toString() !== req.user?.id) {
            return res.status(403).json({ message: 'Not authorized to review this job' });
        }

        const contract = await Contract.findOne({ jobId, studentId });
        if (!contract) {
            return res.status(404).json({ message: 'Contract not found for this job.' });
        }
        if (contract.status !== 'completed' || contract.escrowStatus !== 'released') {
            return res.status(400).json({ message: 'Job must be completed before review.' });
        }

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const hasReview = (student.reviews || []).some(
            (review) => review.contractId?.toString() === contract._id.toString()
        );
        if (hasReview) {
            return res.status(400).json({ message: 'Review already submitted for this job.' });
        }

        const client = await User.findById(req.user?.id).select('name');
        const review = {
            jobId: job._id,
            contractId: contract._id,
            jobTitle: job.title,
            clientName: client?.name || 'Client',
            rating: ratingValue,
            comment,
        };

        student.reviews = student.reviews || [];
        student.reviews.push(review);
        student.jobsCompleted = Math.max(student.jobsCompleted || 0, student.reviews.length);
        await student.save();

        res.status(201).json({ message: 'Review submitted successfully', review, jobsCompleted: student.jobsCompleted });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting review', error });
    }
};

// GET /jobs/:id - Get a single job
const getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('employer', 'name email')
            .populate('requiredSkills', 'name')
            .populate('selectedStudent', 'name email');
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching job', error });
    }
};

module.exports = {
    createJob,
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
