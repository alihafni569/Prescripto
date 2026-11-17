const { z } = require("zod");
const { paginationShape, nonEmpty, nonEmptyMessage } = require("./common");
const { createPerson } = require("./people.validator");
const { doctorProfileShape } = require("./doctor.validator");
const { patientProfileShape } = require("./patient.validator");

const ROLES = ["admin", "doctor", "patient"];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

const email = z.string().trim().toLowerCase().email().max(255);
// bcrypt only uses the first 72 bytes
const password = z.string().min(8).max(72);

const userIdParam = z.object({
  id: z.coerce.number().int().positive(),
});

const login = z.object({
  email,
  password,
});

const createUser = z.discriminatedUnion("role", [
  z.object({
    email: email,
    password,
    role: z.literal("admin"),
    isActive: z.boolean().optional(),
    person: createPerson,
  }),

  z.object({
    email: email,
    password,
    role: z.literal("doctor"),
    isActive: z.boolean().optional(),
    person: createPerson,
    profile: doctorProfileShape,
  }),

  z.object({
    email: email,
    password,
    role: z.literal("patient"),
    isActive: z.boolean().optional(),
    person: createPerson,
    profile: patientProfileShape,
  }),
]);

// The uploaded file as multer gives it (attachImage puts it in person.image).
// z.file() only matches browser File objects, so we validate the multer object instead.
const uploadedImage = z.custom(
  (file) =>
    file !== null &&
    typeof file === "object" &&
    typeof file.mimetype === "string" &&
    file.mimetype.startsWith("image/") &&
    file.size > 0 &&
    file.size <= MAX_IMAGE_SIZE,
  "Image must be an image file up to 2 MB",
);

// PATCH /users/:id and PATCH /auth/me
// multipart body: person[name], person[phone], ... and the file as person[image].
// `role` is intentionally NOT updatable: it decides which profile row exists
// (Doctor / Patient), so changing it would leave orphaned data.
// .strict() makes sending `role` (or any unknown top-level key) fail.
const updateUser = z
  .object({
    person: z
      .object({
        name: z.string().trim().min(2).max(150).optional(),
        email: z.string().trim().toLowerCase().email().optional(),
        phone: z.string().trim().optional(),
        gender: z.enum(["Male", "Female", "Not Selected"]).optional(),
        birthdate: z.string().optional(),
        image: uploadedImage.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.person && Object.keys(data.person).length > 0,
    "At least one field must be provided",
  );

const listUsers = z.object({
  ...paginationShape,
  role: z.enum(ROLES).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().trim().min(1).optional(),
});

module.exports = { createUser, updateUser, listUsers, userIdParam, login };
