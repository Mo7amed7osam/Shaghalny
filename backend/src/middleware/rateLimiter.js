const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/jwt");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

// Keys on the verified JWT user id (falls back to IP), so users sharing an IP
// (campus NAT, reverse proxy) don't exhaust each other's quota. Runs before
// `authenticate`, so it verifies the token itself; a forged token gets the IP key.
const userKey = (req) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const { id } = jwt.verify(token, JWT_SECRET);
      if (id) return `user:${id}`;
    } catch (error) {
      // invalid token: fall through to IP
    }
  }
  return ipKeyGenerator(req.ip);
};

// Separate store from the public limiter above.
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

module.exports = apiLimiter;
module.exports.userLimiter = userLimiter;
