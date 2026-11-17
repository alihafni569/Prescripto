const bcrypt = require("bcryptjs");
const repo = require("../repositories/users.repository");
const peopleRepo = require("../repositories/people.repository");
const AppError = require("../utils/AppError");
const { toSkipTake, buildMeta } = require("../utils/pagination");

const SALT_ROUNDS = 10;

// One place that decides what a user looks like in responses
const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  isActive: user.isActive,
  role: user.role,
  People: user.People,
});

const getAll = async ({ page, limit, ...filters }) => {
  const [items, total] = await Promise.all([
    repo.findAll({ ...toSkipTake({ page, limit }), ...filters }),
    repo.count(filters),
  ]);
  return {
    data: items.map((item) => ({ user: toPublicUser(item) })),
    meta: buildMeta({ page, limit, total }),
  };
};

const getById = async (id) => {
  const user = await repo.findById(id);
  if (!user) throw new AppError("User not found", 404);
  return { user: toPublicUser(user) };
};

// body is already validated by zod (createUserSchema)
const create = async (body) => {
  const person = await peopleRepo.findById(body.person_id);
  if (!person) throw new AppError("Person not found", 404);

  // person_id and email are unique: duplicates come back as 409
  const created = await repo.create({
    person_id: body.person_id,
    email: body.email ?? person.email,
    password: await bcrypt.hash(body.password, SALT_ROUNDS),
    role: body.role,
    isActive: body.isActive,
  });
  return { user: toPublicUser(created) };
};

// body is already validated by zod (updateUserSchema), so no manual checks here
const update = async (id, body, actingUser) => {
  // An admin must not lock themselves out
  if (actingUser?.id === id && body.isActive === false) {
    throw new AppError("You cannot deactivate your own account", 403);
  }

  const existing = await repo.findById(id);
  if (!existing) throw new AppError("User not found", 404);

  const userData = {};
  const personData = {};

  if (body.name !== undefined) personData.name = body.name;
  if (body.phone !== undefined) personData.phone = body.phone;
  if (body.gender !== undefined) personData.gender = body.gender;
  if (body.image !== undefined) personData.image = body.image;
  if (body.birthdate !== undefined) personData.birthdate = body.birthdate; // Date or null

  // Email lives in BOTH Users and People, keep them in sync
  if (body.email !== undefined) {
    userData.email = body.email;
    personData.email = body.email;
  }

  if (body.isActive !== undefined) userData.isActive = body.isActive;

  if (body.password !== undefined) {
    userData.password = await bcrypt.hash(body.password, SALT_ROUNDS);
  }

  try {
    const updated = await repo.updateWithPerson(id, { userData, personData });
    return { user: toPublicUser(updated) };
  } catch (error) {
    if (error.code === "P2002")
      throw new AppError("Email is already in use", 409);
    if (error.code === "P2025") throw new AppError("User not found", 404);
    throw error;
  }
};

const remove = async (id) => {
  await getById(id); // throws 404 if missing
  await repo.remove(id);
};

module.exports = { getAll, getById, create, update, remove };
