const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const { userLimiter, userKey } = require("../../middleware/rateLimiter");
const { authenticate } = require("../../middleware/auth");
const { checkRole } = require("../../middleware/roleCheck");
const { chat, getStatus } = require("./companion.controller");

// AI calls are costly and free-tier quotas are small: cap each student.
const companionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.COMPANION_RATE_LIMIT) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: { message: "You're sending messages quickly. Wait a few minutes and try again.", code: "rate_limited", retryable: true },
});

router.use(userLimiter, authenticate, checkRole("Student"));

router.get("/status", getStatus);
router.post("/chat", companionLimiter, chat);

module.exports = router;
