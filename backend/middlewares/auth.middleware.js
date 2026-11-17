const jwt = require("jsonwebtoken");
const userService = require("../services/users.service");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.userId = decoded.userId;
    const result = await userService.getById(req.userId);

    const u = result.user ?? result;

    req.user = {
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      person_id: u.person_id ?? u.People?.id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
