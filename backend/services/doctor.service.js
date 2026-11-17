const repo = require("../repositories/doctor.repository");
const peopleRepo = require("../repositories/people.repository");
const specializationRepo = require("../repositories/specialization.repository");
const AppError = require("../utils/AppError");
const { toSkipTake, buildMeta } = require("../utils/pagination");
const { serializePerson } = require("../utils/person");
const { uploadImage, deleteImage } = require("../services/cloudinary.service");
const { MAX_APPOINTMENTS_PER_DAY } = require("../utils/roles");
// doctor fields + person data under `person` + specialization
const toDto = (doctor, availableDays) => {
  if (!doctor) return null;
  const { People, Specialization, ...rest } = doctor;
  return {
    ...rest,
    fee: Number(rest.fee),
    person: serializePerson(People),
    specialization: Specialization,
    availableDays,
  };
};

const assertSpecializationExists = async (id) => {
  if (!(await specializationRepo.findById(id))) {
    throw new AppError("Specialization not found", 404);
  }
};

const getAll = async ({ page, limit, ...filters }) => {
  const [items, total] = await Promise.all([
    repo.findAll({
      ...toSkipTake({ page, limit }),
      ...filters,
    }),
    repo.count(filters),
  ]);

  return {
    data: items.map((doctor) => toDto(doctor)),
    meta: buildMeta({ page, limit, total }),
  };
};
const getById = async (id, maxAppointments = MAX_APPOINTMENTS_PER_DAY) => {
  const doctorId = Number(id);

  const doctor = await repo.findById(doctorId);

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  const availableDays = await getNextWeekAvailableDays(
    doctorId,
    maxAppointments,
  );

  return toDto(doctor, availableDays);
};

const create = async (body) => {
  await assertSpecializationExists(body.specialization_id);

  if (body.person_id !== undefined) {
    const person = await peopleRepo.findById(body.person_id);
    if (!person) throw new AppError("Person not found", 404);
    if (person.Doctor)
      throw new AppError("This person is already a doctor", 409);
  }

  // duplicate email/phone on a new person -> 409
  if (body.person?.email) {
    const existingPerson = await peopleRepo.findByEmail(body.person.email);
    if (existingPerson) {
      throw new AppError("A person with this email already exists", 409);
    }
  }
  if (body.person?.phone) {
    const existingPerson = await peopleRepo.findByPhone(body.person.phone);
    if (existingPerson) {
      throw new AppError("A person with this phone already exists", 409);
    }
  }

  // take only a real uploaded file; never trust a plain "image" value
  const file = body.image?.buffer ? body.image : null;
  delete body.image;

  let imageUrl;
  if (file) {
    const result = await uploadImage(file.buffer, "prescripto/doctors");
    imageUrl = result.secure_url;
  }

  try {
    return toDto(
      await repo.createWithPerson({
        ...body,
        ...(imageUrl && { image: imageUrl }),
      }),
    );
  } catch (err) {
    // don't leave an orphan image in Cloudinary if the DB insert failed
    if (imageUrl) await deleteImage(imageUrl).catch(() => {});
    throw err;
  }
};

const update = async (id, body) => {
  const doctorId = parseInt(id, 10);

  const doctor = await repo.findById(doctorId);
  if (!doctor) throw new AppError("Doctor not found", 404);

  if (body.specialization_id !== undefined) {
    await assertSpecializationExists(body.specialization_id);
  }

  // take only a real uploaded file; never trust a plain "image" value
  const file = body.image?.buffer ? body.image : null;
  delete body.image;

  if ((body.person || file) && doctor.person_id === null) {
    throw new AppError("This doctor has no linked person to update", 400);
  }

  let newImageUrl;
  if (file) {
    const result = await uploadImage(file.buffer, "prescripto/doctors");
    newImageUrl = result.secure_url;
  }

  const updated = await repo.updateWithPerson(doctorId, doctor.person_id, {
    ...body,
    ...(newImageUrl && { image: newImageUrl }),
  });

  // delete the old image only after the DB update succeeded
  if (newImageUrl && doctor.People?.image) {
    await deleteImage(doctor.People.image).catch(() => {});
  }

  return toDto(updated);
};

// Fails with 409 if the doctor still has appointments
const remove = async (id) => {
  const doctor = await repo.findById(id);

  // guard: the doctor may not exist (wrong id or already deleted)
  if (!doctor) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }

  // delete the image only if there is one
  if (doctor.People.image) {
    await deleteImage(doctor.People.image);
  }

  await repo.remove(id);
  return doctor;
};

const getDashboardStats = async (doctorId) => {
  const stats = await repo.getDashboardStats(doctorId);
  return {
    appointmentsCount: stats.appointmentsCount,
    pendingCount: stats.pendingCount,
    confirmedCount: stats.confirmedCount,
    completedCount: stats.completedCount,
    cancelledCount: stats.cancelledCount,
    latestAppointments: stats.latestAppointments,
  };
};

const getByUserId = async (userId) => {
  const doctor = await repo.findByUserId(userId);
  if (!doctor) throw new AppError("Doctor not found", 404);
  return toDto(doctor);
};

const getByPersonId = async (personId) => {
  const doctor = await repo.findByPersonId(personId);
  if (!doctor) throw new AppError("Doctor not found", 404);
  return toDto(doctor);
};

const getNextWeekAvailableDays = async (doctorId, maxAppointments) => {
  const id = Number(doctorId);
  const max = Number(maxAppointments);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Invalid doctor ID", 400);
  }

  if (!Number.isInteger(max) || max <= 0) {
    throw new AppError("Maximum appointments must be a positive integer", 400);
  }

  const today = new Date();

  // Next Monday (UTC)
  const daysUntilMonday = (8 - today.getUTCDay()) % 7 || 7;

  const startDate = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + daysUntilMonday,
    ),
  );

  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 7);

  const appointmentCounts = await repo.getAppointmentCountsByDate(
    id,
    startDate,
    endDate,
  );

  const countsMap = new Map(
    appointmentCounts.map((item) => [
      item.appointment_date.toISOString().slice(0, 10),
      item._count._all,
    ]),
  );

  const availableDays = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);

    const dateString = date.toISOString().slice(0, 10);
    const bookedAppointments = countsMap.get(dateString) || 0;

    if (bookedAppointments < max) {
      availableDays.push({
        date: dateString,
        bookedAppointments,
        remainingAppointments: max - bookedAppointments,
      });
    }
  }

  return availableDays;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getDashboardStats,
  getByUserId,
  getByPersonId,
};
