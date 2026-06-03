const User = require('../models/User');
const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const InterviewSession = require('../modules/ai-interview/interview.model');
const { studentHasRequiredVerifiedSkills } = require('../utils/proposalEligibility');

// Fetch student profile by ID
const getStudentProfile = async (req, res) => {
    try {
        const studentId = req.params.id;
        const isSelf = req.user?.id === studentId;
        const isAdmin = req.user?.role === 'Admin';
        const isClient = req.user?.role === 'Client';

        if (!isSelf && !isAdmin && !isClient) {
            return res.status(403).json({ message: 'Not authorized to view this profile' });
        }

        const student = await User.findById(studentId)
            .populate('verifiedSkills.skill', 'name')
            .select('name email description university portfolioLinks profilePhotoUrl verifiedSkills reviews jobsCompleted cvUrl role balance');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const completedSessions = await InterviewSession.find({
            user: studentId,
            status: 'completed',
        })
            .populate('skillRef', 'name')
            .select('skill skillRef');

        const completedSkillIds = new Set(
            completedSessions
                .map((session) => session.skillRef?._id?.toString?.() || session.skillRef?.toString?.())
                .filter(Boolean)
        );
        const completedSkillNames = new Set(
            completedSessions
                .map((session) => String(session.skillRef?.name || session.skill || '').trim().toLowerCase())
                .filter(Boolean)
        );

        const filteredVerifiedSkills = (student.verifiedSkills || []).filter((entry) => {
            const skillId = entry.skill?._id?.toString?.() || entry.skill?.toString?.();
            const skillName = String(entry.skill?.name || '').trim().toLowerCase();

            return completedSkillIds.has(skillId) || (skillName && completedSkillNames.has(skillName));
        });

        if (filteredVerifiedSkills.length !== (student.verifiedSkills || []).length) {
            student.verifiedSkills = filteredVerifiedSkills;
            await student.save();
        }

        const safeProfile = {
            id: student._id,
            name: student.name,
            description: student.description,
            university: student.university,
            portfolioLinks: student.portfolioLinks || [],
            profilePhotoUrl: student.profilePhotoUrl,
            verifiedSkills: filteredVerifiedSkills.map((skill) => ({
                skill: skill.skill,
                score: skill.score,
                verifiedAt: skill.verifiedAt,
            })),
            reviews: student.reviews || [],
            jobsCompleted: student.jobsCompleted || 0,
        };

        if (isSelf || isAdmin) {
            safeProfile.email = student.email;
            safeProfile.cvUrl = student.cvUrl;
            safeProfile.balance = student.balance;
        }

        const jobId = (req.query.jobId || '').toString().trim();
        if (jobId) {
            const job = await Job.findById(jobId).select('employer');
            if (!job) {
                return res.status(404).json({ message: 'Job not found' });
            }
            if (isClient && job.employer.toString() !== req.user?.id) {
                return res.status(403).json({ message: 'Not authorized to view proposals for this job' });
            }
            if (isSelf || isAdmin || isClient) {
                const proposals = await Proposal.find({ jobId, studentId })
                    .select('status details proposedBudget createdAt')
                    .sort({ createdAt: -1 });
                safeProfile.proposalHistory = proposals;
            }
        }

        res.status(200).json(safeProfile);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Update student profile
const updateStudentProfile = async (req, res) => {
    try {
        const studentId = req.params.id;
        if (req.user?.id !== studentId && req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to update this profile' });
        }
        const allowedFields = ['name', 'description', 'profilePhotoUrl', 'university', 'portfolioLinks'];
        const updatedData = allowedFields.reduce((acc, field) => {
            if (req.body[field] !== undefined) {
                acc[field] = req.body[field];
            }
            return acc;
        }, {});

        if (updatedData.portfolioLinks !== undefined) {
            if (Array.isArray(updatedData.portfolioLinks)) {
                updatedData.portfolioLinks = updatedData.portfolioLinks.filter(Boolean);
            } else if (typeof updatedData.portfolioLinks === 'string') {
                updatedData.portfolioLinks = updatedData.portfolioLinks
                    .split('\n')
                    .map((link) => link.trim())
                    .filter(Boolean);
            } else {
                return res.status(400).json({ message: 'portfolioLinks must be an array or string.' });
            }
        }

        const updatedStudent = await User.findByIdAndUpdate(studentId, updatedData, { new: true }).select('-password');
        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.status(200).json(updatedStudent);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Upload profile photo
const uploadStudentPhoto = async (req, res) => {
    try {
        const studentId = req.params.id;
        if (req.user?.id !== studentId && req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to upload for this profile' });
        }
        const photoFile = req.file;

        if (!photoFile) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        if (!photoFile.mimetype?.startsWith('image/')) {
            return res.status(400).json({ message: 'Profile photo must be an image.' });
        }

        const profilePhotoUrl = `/uploads/photos/${photoFile.filename}`;
        await User.findByIdAndUpdate(studentId, { profilePhotoUrl });

        res.status(200).json({ message: 'Profile photo uploaded successfully', profilePhotoUrl });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Upload CV
const uploadStudentCV = async (req, res) => {
    try {
        const studentId = req.params.id;
        if (req.user?.id !== studentId && req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to upload for this profile' });
        }
        const cvFile = req.file;

        if (!cvFile) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const cvUrl = `/uploads/cvs/${cvFile.filename}`;
        await User.findByIdAndUpdate(studentId, { cvUrl });

        res.status(200).json({ message: 'CV uploaded successfully', cvUrl });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Browse available jobs
const browseJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ status: 'open' })
            .populate('employer', 'name')
            .populate('requiredSkills', 'name');
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Submit a proposal for a job
const submitProposal = async (req, res) => {
    try {
        const jobId = req.params.jobId || req.body.jobId;
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

        const proposal = new Proposal({
            jobId,
            studentId: req.user?.id,
            details,
            proposedBudget: parsedBudget,
            status: 'submitted',
        });
        await proposal.save();

        if (req.user?.id) {
            job.applicants.push(req.user.id);
        }
        await job.save();

        res.status(201).json(proposal);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// View proposals for the student
const getStudentProposals = async (req, res) => {
    try {
        const studentId = req.params.id;
        if (req.user?.id !== studentId && req.user?.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to view these proposals' });
        }
        const proposals = await Proposal.find({ studentId })
            .populate('jobId', 'title status')
            .sort({ createdAt: -1 });
        res.status(200).json(proposals);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

module.exports = {
    getStudentProfile,
    updateStudentProfile,
    uploadStudentCV,
    uploadStudentPhoto,
    browseJobs,
    submitProposal,
    getStudentProposals,
};
