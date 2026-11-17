const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");

// Default select: NEVER includes the password hash
const select = {
  id: true,
  person_id: true,
  email: true,
  role: true,
  isActive: true,
  People: {
    select: {
      id: true,
      name: true,
      phone: true,
      image: true,
      gender: true,
      birthdate: true,
    },
  },
};

// Used only for login (needs the hash to compare with bcrypt)
const selectWithPassword = { ...select, password: true };

const buildWhere = ({ role, isActive, search }) => ({
  ...(role ? { role } : {}),
  ...(isActive !== undefined ? { isActive } : {}),
  ...(search ? { email: { contains: search } } : {}),
});

const findAll = ({ skip, take, ...filters }) =>
  prisma.users.findMany({
    where: buildWhere(filters),
    skip,
    take,
    select,
    orderBy: { id: "asc" },
  });

const count = (filters) => prisma.users.count({ where: buildWhere(filters) });

const findById = (id) => prisma.users.findUnique({ where: { id }, select });

const create = (data) => prisma.users.create({ data, select });

const update = (id, userData) =>
  prisma.users.update({
    where: { id },
    data: { ...userData },
    select,
  });

// Updates the Users row and its linked People row in ONE atomic write.
// A nested write is a single transaction, so either both change or neither does.
// `userData`   -> columns of Users   (email, password, isActive)
// `personData` -> columns of People  (name, phone, gender, birthdate, image, email)
const updateWithPerson = (id, { userData = {}, personData = {} }) =>
  prisma.users.update({
    where: { id },
    data: {
      ...userData,
      ...(Object.keys(personData).length > 0
        ? { People: { update: { ...personData, updated_at: new Date() } } }
        : {}),
    },
    select, // never returns the password hash
  });

const remove = (id) => prisma.users.delete({ where: { id } });

// Includes the password hash, use it for login only
const findByEmail = (email) =>
  prisma.users.findUnique({ where: { email }, select: selectWithPassword });

// ---------- shared transaction runner ----------
// `await` is required: without it the try/catch cannot catch a rejected transaction.
async function runTransaction(label, work) {
  try {
    return await prisma.$transaction(work);
  } catch (error) {
    console.error(`${label} transaction failed:`, {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
    throw error;
  }
}

// People row, same for patient and doctor
const createPerson = (tx, person, now) =>
  tx.people.create({
    data: {
      name: person.name,
      email: person.email,
      phone: person.phone,
      gender: person.gender,
      birthdate: person.birthdate ? new Date(person.birthdate) : null,
      image: person.image ?? null,
      updated_at: now,
    },
  });

// Users row, same for patient and doctor
const createUser = (tx, { personId, email, passwordHash, role }) =>
  tx.users.create({
    data: {
      person_id: personId,
      email,
      password: passwordHash,
      role,
    },
    select: { id: true, email: true, role: true, isActive: true },
  });

// ---------- PATIENT: People + Patient + Users ----------
async function createPatientAccount({ person, profile, passwordHash }) {
  const now = new Date();

  return runTransaction("Patient registration", async (tx) => {
    // 1) People
    const newPerson = await createPerson(tx, person, now);

    // 2) Patient
    const newProfile = await tx.patient.create({
      data: {
        person_id: newPerson.id,
        bloodType: profile.bloodType,
        created_at: now,
        updated_at: now,
      },
    });

    // 3) Users
    const newUser = await createUser(tx, {
      personId: newPerson.id,
      email: person.email,
      passwordHash,
      role: "patient",
    });

    return { person: newPerson, profile: newProfile, user: newUser };
  });
}

// ---------- DOCTOR: People + Doctor + Users ----------
async function createDoctorAccount({ person, profile, passwordHash }) {
  const now = new Date();

  try {
    return await runTransaction("Doctor registration", async (tx) => {
      // 1) People
      const newPerson = await createPerson(tx, person, now);

      // 2) Doctor
      const newProfile = await tx.doctor.create({
        data: {
          person_id: newPerson.id,
          specialization_id: Number(profile.specializationId),
          degree: profile.degree,
          experience: Number(profile.experience),
          about: profile.about,
          fee: profile.fee,
          active: true,
          created_at: now,
          updated_at: now,
        },
      });

      // 3) Users
      const newUser = await createUser(tx, {
        personId: newPerson.id,
        email: person.email,
        passwordHash,
        role: "doctor",
      });

      return { person: newPerson, profile: newProfile, user: newUser };
    });
  } catch (error) {
    // Foreign key failure = specializationId does not exist
    if (error.code === "P2003") {
      throw new AppError("Specialization not found", 400);
    }
    throw error;
  }
}

module.exports = {
  findAll,
  count,
  findById,
  create,
  update,
  updateWithPerson,
  remove,
  findByEmail,
  createDoctorAccount,
  createPatientAccount,
};
