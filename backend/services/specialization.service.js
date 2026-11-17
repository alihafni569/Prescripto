const repo = require("../repositories/specialization.repository");
const AppError = require("../utils/AppError");
const { toSkipTake, buildMeta } = require("../utils/pagination");

const toDto = (spec) => {
  if (!spec) return null;
  const { _count, ...rest } = spec;
  return { ...rest, doctors_count: _count.Doctor };
};

const getAll = async ({ page, limit, search }) => {
  const [items, total] = await Promise.all([
    repo.findAll({ ...toSkipTake({ page, limit }), search }),
    repo.count({ search }),
  ]);
  return { data: items.map(toDto), meta: buildMeta({ page, limit, total }) };
};

const getById = async (id) => {
  const spec = await repo.findById(id);
  if (!spec) throw new AppError("Specialization not found", 404);
  return toDto(spec);
};

const create = async (body) => toDto(await repo.create(body));

const update = async (id, body) => {
  await getById(id);
  return toDto(await repo.update(id, body));
};

// Fails with 409 if doctors still use this specialization
const remove = async (id) => {
  await getById(id);
  await repo.remove(id);
};

module.exports = { getAll, getById, create, update, remove };
