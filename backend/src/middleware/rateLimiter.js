const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

// For routes behind `authenticate`: counts per user instead of per IP, so
// users sharing an IP (campus NAT, reverse proxy) don't exhaust each other's
// quota, and it uses its own store separate from the public limiter above.
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip),
  message: {
    message: "Too many requests. Please try again later.",
  },
});

module.exports = apiLimiter;
module.exports.userLimiter = userLimiter;
