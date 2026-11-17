const { z } = require("zod");

const idParam = z.object({ id: z.coerce.number().int().positive() });

const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected format YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected format HH:mm (24h)");

const nonEmpty = (obj) => Object.keys(obj).length > 0;
const nonEmptyMessage = { message: "Provide at least one field to update" };

module.exports = { idParam, paginationShape, dateString, timeString, nonEmpty, nonEmptyMessage };
