const { z } = require("zod");
const { paginationShape, nonEmpty, nonEmptyMessage } = require("./common");
const { personCreate, personUpdateShape } = require("./people.validator");

const doctorFields = {
  specialization_id: z.number().int().positive(),
  degree: z.string().trim().min(2).max(255),
  experience: z.number().int().min(0).max(70),
  about: z.string().trim().min(1).max(1000), // Prisma String on SQL Server = NVarChar(1000)
  fee: z.number().nonnegative().max(99999999.99),
  active: z.boolean(),
};

// Profile fields only (no person / person_id), used inside createUser
const doctorProfileShape = z.object(doctorFields);

const createDoctor = doctorProfileShape
  .extend({
    person_id: z.number().int().positive().optional(),
    person: personCreate.optional(),
  })
  .refine((d) => (d.person_id === undefined) !== (d.person === undefined), {
    message: "Provide exactly one of person_id or person",
    path: ["person"],
  });

const updateDoctor = z
  .object({ ...doctorFields, person: personUpdateShape })
  .partial()
  .refine(nonEmpty, nonEmptyMessage);

const listDoctors = z.object({
  ...paginationShape,
  specialization_id: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
});

module.exports = {
  doctorProfileShape,
  createDoctor,
  updateDoctor,
  listDoctors,
};
