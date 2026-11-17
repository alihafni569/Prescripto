const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    status: "fail",
    message: "Too many requests. Please try again later.",
  },
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  skipSuccessfulRequests: true, // only failed attempts count
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    status: "fail",
    message:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

// Booking limiter: keyed by user id when logged in, falls back to IP
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip),

  message: {
    status: "fail",
    message: "Too many booking attempts. Please try again after 15 minutes.",
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  bookingLimiter,
};
