const prisma = require("../lib/prisma");

const select = {
  id: true,
  name: true,
  created_at: true,
  updated_at: true,
  image: true,
  _count: { select: { Doctor: true } },
};

const buildWhere = (search) =>
  search ? { name: { contains: search } } : undefined;

const findAll = ({ skip, take, search }) =>
  prisma.specialization.findMany({
    where: buildWhere(search),
    skip,
    take,
    select,
    orderBy: { name: "asc" },
  });

const count = ({ search }) =>
  prisma.specialization.count({ where: buildWhere(search) });

const findById = (id) =>
  prisma.specialization.findUnique({ where: { id }, select });

const create = (data) => prisma.specialization.create({ data, select });

const update = (id, data) =>
  prisma.specialization.update({
    where: { id },
    data: { ...data, updated_at: new Date() },
    select,
  });

const remove = (id) => prisma.specialization.delete({ where: { id } });

module.exports = { findAll, count, findById, create, update, remove };
