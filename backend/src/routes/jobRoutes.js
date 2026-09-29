const router = require("express").Router();
const apiLimiter = require("../middleware/rateLimiter");
const {
  createJob,
  getJobs,
  getJobById,
  submitProposal,
  getJobProposals,
  getClientJobs,
  getMatchedCandidates,
  selectStudentForJob,
  getClientProposals,
  submitJobReview,
} = require("../controllers/jobController");
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

// Route to post a new job
router.post("/", apiLimiter, authenticate, checkRole("Client"), createJob);

// Route to get all jobs
router.get("/", getJobs);

// Route to get jobs for a client
router.get(
  "/mine",
  apiLimiter,
  authenticate,
  checkRole("Client"),
  getClientJobs,
);
// Route to submit a proposal for a job
router.post(
  "/:id/proposals",
  apiLimiter,
  authenticate,
  checkRole("Student"),
  submitProposal,
);

// Route to get proposals for a job
router.get(
  "/:id/proposals",
  apiLimiter,
  authenticate,
  checkRole("Client"),
  getJobProposals,
);

// Route to get matched candidates for a job
router.get(
  "/:id/matches",
  apiLimiter,
  authenticate,
  checkRole("Client"),
  getMatchedCandidates,
);

// Route to select a student for a job
router.post(
  "/:id/select",
  apiLimiter,
  authenticate,
  checkRole("Client"),
  selectStudentForJob,
);

// Route to get proposals across client jobs
router.get(
  "/proposals/client",
  apiLimiter,
  authenticate,
  checkRole("Client"),
  getClientProposals,
);

// Route to submit a review for a job's selected student
router.post(
  "/:id/reviews",
  apiLimiter,
  authenticate,
  checkRole("Client"),
  submitJobReview,
);
// Route to get a single job
router.get("/:id", apiLimiter, getJobById);
module.exports = router;
