const router = require("express").Router();
const {
  getContract,
  listContracts,
  submitWork,
  acceptWork,
  requestChanges,
  submitReview,
  sendMessage,
} = require("../controllers/contractController");
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

// List contracts for current user
router.get(
  "/",
  authenticate,
  checkRole(["Student", "Client", "Admin"]),
  listContracts,
);

// Get contract details
router.get(
  "/:id",
  authenticate,
  checkRole(["Student", "Client", "Admin"]),
  getContract,
);

// Student submits work
router.post("/:id/submissions", authenticate, checkRole("Student"), submitWork);

// Client accepts work
router.post("/:id/accept", authenticate, checkRole("Client"), acceptWork);

// Client requests changes
router.post(
  "/:id/request-changes",
  authenticate,
  checkRole("Client"),
  requestChanges,
);

// Client submits review
router.post("/:id/review", authenticate, checkRole("Client"), submitReview);

// Client or student sends a contract message
router.post(
  "/:id/messages",
  authenticate,
  checkRole(["Student", "Client"]),
  sendMessage,
);

module.exports = router;
