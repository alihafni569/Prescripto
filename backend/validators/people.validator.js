const { z } = require("zod");
const {
  paginationShape,
  dateString,
  nonEmpty,
  nonEmptyMessage,
} = require("./common");

const personFields = {
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(255),
  // People.phone is VarChar(15): optional leading "+" then 7-14 digits
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{7,14}$/, "Phone must be 7-14 digits, optional leading +"),
  gender: z.preprocess(
    (v) => (typeof v === "string" ? v.toLowerCase() : v),
    z.enum(["male", "female", "Female", "Male"]),
  ),
  birthdate: dateString.nullable(),
  image: z.file().optional(),
};

const personCreate = z.object(personFields);
const personUpdateShape = z.object(personFields).partial();
const updatePerson = personUpdateShape.refine(nonEmpty, nonEmptyMessage);

const listPeople = z.object({
  ...paginationShape,
  search: z.string().trim().min(1).optional(),
});

module.exports = {
  personCreate,
  personUpdateShape,
  createPerson: personCreate,
  updatePerson,
  listPeople,
};
