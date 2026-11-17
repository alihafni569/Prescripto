const { z } = require("zod");
const { paginationShape, nonEmpty, nonEmptyMessage } = require("./common");
const { personCreate, personUpdateShape } = require("./people.validator");

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Profile fields only (no person / person_id), used when the person
// is provided separately, e.g. inside createUser
const patientProfileShape = z.object({
  bloodType: z.enum(BLOOD_TYPES),
});

// Either link an existing person (person_id) or create one inline (person)
const createPatient = patientProfileShape
  .extend({
    person_id: z.number().int().positive().optional(),
    person: personCreate.optional(),
  })
  .refine((d) => (d.person_id === undefined) !== (d.person === undefined), {
    message: "Provide exactly one of person_id or person",
    path: ["person"],
  });

const updatePatient = z
  .object({
    person: personUpdateShape.optional(),
  })
  .refine(nonEmpty, nonEmptyMessage);

const listPatients = z.object({
  ...paginationShape,
  search: z.string().trim().min(1).optional(),
});

module.exports = {
  patientProfileShape,
  createPatient,
  updatePatient,
  listPatients,
};
