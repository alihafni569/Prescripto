const { Prisma } = require("@prisma/client");
const { ZodError } = require("zod");
const AppError = require("../utils/AppError");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return res.status(409).json({
          message: "A record with the same unique value already exists",
          fields: err.meta?.target,
        });
      case "P2003":
        return res.status(409).json({
          message:
            "Operation blocked: this record is linked to other records (or references one that does not exist)",
        });
      case "P2025":
        return res.status(404).json({ message: "Record not found" });
      default:
        break;
    }
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
};

module.exports = errorHandler;
