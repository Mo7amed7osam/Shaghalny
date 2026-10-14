const apiLimiter = require("../middleware/rateLimiter");
const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { checkAdmin } = require("../middleware/roleCheck");
const {
  reviewInterview,
  getSubmittedInterviews,
  getInterviewById,
  getUsers,
  getJobs,
  deleteUser,
  deleteJob,
  createSkill,
  updateSkill,
} = require("../controllers/adminController");
const {
  listTopUps,
  approveTopUp,
  declineTopUp,
  listWithdrawals,
  approveWithdrawal,
  declineWithdrawal,
} = require("../controllers/paymentAdminController");
router.use(apiLimiter);
// Route to get all submitted interviews for review
router.get("/interviews", authenticate, checkAdmin, getSubmittedInterviews);

// Route to review a specific interview
router.post("/review/:interviewId", authenticate, checkAdmin, reviewInterview);
router.post(
  "/interviews/:interviewId/evaluate",
  authenticate,
  checkAdmin,
  reviewInterview,
);

router.get(
  "/interviews/:interviewId",
  authenticate,
  checkAdmin,
  getInterviewById,
);

// Admin: manage users and jobs
router.get("/users", authenticate, checkAdmin, getUsers);
router.delete("/users/:userId", authenticate, checkAdmin, deleteUser);
router.get("/jobs", authenticate, checkAdmin, getJobs);
router.delete("/jobs/:jobId", authenticate, checkAdmin, deleteJob);

// Admin: manage skills
router.post("/skills", authenticate, checkAdmin, createSkill);
router.patch("/skills/:id", authenticate, checkAdmin, updateSkill);
// Admin: payment reviews
router.get("/payments/topups", authenticate, checkAdmin, listTopUps);
router.post(
  "/payments/topups/:id/approve",
  authenticate,
  checkAdmin,
  approveTopUp,
);
router.post(
  "/payments/topups/:id/decline",
  authenticate,
  checkAdmin,
  declineTopUp,
);
router.get("/payments/withdrawals", authenticate, checkAdmin, listWithdrawals);
router.post(
  "/payments/withdrawals/:id/approve",
  authenticate,
  checkAdmin,
  approveWithdrawal,
);
router.post(
  "/payments/withdrawals/:id/decline",
  authenticate,
  checkAdmin,
  declineWithdrawal,
);

module.exports = router;
