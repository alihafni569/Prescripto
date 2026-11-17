const prisma = require("../lib/prisma");
const { personSearchFilter } = require("../utils/person");

const select = {
  id: true,
  name: true,
  email: true,
  phone: true,
  gender: true,
  birthdate: true,
  image: true,
  created_at: true,
  updated_at: true,
  Doctor: { select: { id: true } },
  Patient: { select: { id: true } },
};

const buildWhere = (search) =>
  search ? personSearchFilter(search) : undefined;

const findAll = ({ skip, take, search }) =>
  prisma.people.findMany({
    where: buildWhere(search),
    skip,
    take,
    select,
    orderBy: { id: "asc" },
  });

const findByEmail = (email) =>
  prisma.people.findUnique({ where: { email }, select });

const findByPhone = (phone) =>
  prisma.people.findUnique({ where: { phone }, select });

const count = ({ search }) =>
  prisma.people.count({ where: buildWhere(search) });

const findById = (id) => prisma.people.findUnique({ where: { id }, select });

const create = (data) =>
  prisma.people.create({
    data: { ...data, updated_at: new Date(), create_at: new Date() },
    select,
  });

const update = (id, data) =>
  prisma.people.update({
    where: { id },
    data: { ...data, updated_at: new Date() },
    select,
  });

const remove = (id) => prisma.people.delete({ where: { id } });

module.exports = {
  findAll,
  count,
  findById,
  findByEmail,
  findByPhone,
  create,
  update,
  remove,
};
