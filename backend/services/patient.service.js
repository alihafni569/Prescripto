const repo = require("../repositories/patient.repository");
const peopleRepo = require("../repositories/people.repository");
const AppError = require("../utils/AppError");
const { toSkipTake, buildMeta } = require("../utils/pagination");
const { serializePerson } = require("../utils/person");

// patient fields + person data under `person`
const toDto = (patient) => {
  if (!patient) return null;
  const { People, ...rest } = patient;
  return { ...rest, person: serializePerson(People) };
};

const getAll = async ({ page, limit, search }) => {
  const [items, total] = await Promise.all([
    repo.findAll({ ...toSkipTake({ page, limit }), search }),
    repo.count({ search }),
  ]);
  return { data: items.map(toDto), meta: buildMeta({ page, limit, total }) };
};

const getById = async (id) => {
  const patient = await repo.findById(id);
  if (!patient) throw new AppError("Patient not found", 404);
  return toDto(patient);
};

const create = async (body) => {
  if (body.person_id !== undefined) {
    const person = await peopleRepo.findById(body.person_id);
    if (!person) throw new AppError("Person not found", 404);
    if (person.Patient)
      throw new AppError("This person is already a patient", 409);
  }
  // duplicate email/phone on a new person -> 409 from the error handler
  return toDto(await repo.createWithPerson(body));
};

const update = async (id, body) => {
  const patient = await repo.findById(id);
  if (!patient) throw new AppError("Patient not found", 404);
  return toDto(await repo.updateWithPerson(id, patient.person_id, body));
};

const getByUserId = async (userId) => {
  const patient = await repo.findByUserId(userId);
  if (!patient) throw new AppError("Patient not found", 404);
  return toDto(patient);
};

// Fails with 409 if the patient still has appointments
const remove = async (id) => {
  await getById(id);
  await repo.remove(id);
};

const getByPersonId = async (personId) => {
  const patient = await repo.findByPersonId(personId);
  if (!patient) throw new AppError("Patient not found", 404);
  return toDto(patient);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByUserId,
  getByPersonId,
};
