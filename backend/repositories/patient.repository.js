const prisma = require("../lib/prisma");
const { buildPersonData, personSearchFilter } = require("../utils/person");

const include = {
  People: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      gender: true,
      birthdate: true,
      image: true,
    },
  },
};

const buildWhere = (search) =>
  search ? { People: { is: personSearchFilter(search) } } : undefined;

const findAll = ({ skip, take, search }) =>
  prisma.patient.findMany({
    where: buildWhere(search),
    skip,
    take,
    include,
    orderBy: { id: "asc" },
  });

const count = ({ search }) =>
  prisma.patient.count({ where: buildWhere(search) });

const findById = (id) => prisma.patient.findUnique({ where: { id }, include });

const findByPersonId = (personId) =>
  prisma.patient.findUnique({
    where: { person_id: Number(personId) },
    include,
  });

const findByUserId = (userId) => {
  return prisma.patient.findFirst({
    where: {
      People: {
        Users: {
          is: {
            id: Number(userId),
          },
        },
      },
    },
    include,
  });
};

// Creates the person (when given inline) and the patient in one transaction
const createWithPerson = ({ person, person_id, image }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    let personId = person_id;

    if (person) {
      const created = await tx.people.create({
        data: { ...buildPersonData(person), updated_at: now },
      });
      personId = created.id;
    }

    return tx.patient.create({
      data: { image, person_id: personId, created_at: now, updated_at: now },
      include,
    });
  });

// Updates patient fields and (optionally) the linked person in one transaction
const updateWithPerson = (id, personId, { image, person }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();

    if (person && Object.keys(person).length > 0) {
      await tx.people.update({
        where: { id: personId },
        data: { ...buildPersonData(person), updated_at: now },
      });
    }

    return tx.patient.update({
      where: { id },
      data: { image, updated_at: now },
      include,
    });
  });

// Removes only the patient row; the person stays (delete it via /people)
const remove = (id) => prisma.patient.delete({ where: { id } });

module.exports = {
  findAll,
  count,
  findById,
  findByPersonId,
  findByUserId,
  createWithPerson,
  updateWithPerson,
  remove,
};
