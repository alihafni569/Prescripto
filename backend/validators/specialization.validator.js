const { z } = require("zod");
const { paginationShape } = require("./common");

const name = z.string().trim().min(2).max(150);

const createSpecialization = z.object({ name });
const updateSpecialization = z.object({ name });

const listSpecializations = z.object({
  ...paginationShape,
  search: z.string().trim().min(1).optional(),
});

module.exports = { createSpecialization, updateSpecialization, listSpecializations };
