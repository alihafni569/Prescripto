const repo = require("../repositories/appointment.repository");
const doctorRepo = require("../repositories/doctor.repository");
const patientRepo = require("../repositories/patient.repository");
const AppError = require("../utils/AppError");
const { toSkipTake, buildMeta } = require("../utils/pagination");
const { toDate, fmtDate } = require("../utils/datetime");
const { MAX_APPOINTMENTS_PER_DAY } = require("../utils/roles");
const TERMINAL_STATUSES = ["cancelled", "completed"];
const ALLOWED_STATUSES = ["pending", "confirmed", "cancelled", "completed"];
const ACTIVE_STATUSES = ["pending", "confirmed", "completed"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Date as "YYYY-MM-DD", fee as number, names of doctor and patient
const toDto = (appointment) => {
  if (!appointment) return null;
  const { Doctor, Patient, ...rest } = appointment;
  return {
    ...rest,
    appointment_date: fmtDate(rest.appointment_date),
    fee: Number(rest.fee),
    doctor: Doctor && {
      id: Doctor.id,
      specialization_id: Doctor.specialization_id,
      specialization: Doctor.Specialization,
      name: Doctor.People?.name ?? null,
      image: Doctor.People?.image ?? null,
    },
    patient: Patient && { id: Patient.id, name: Patient.People?.name ?? null },
  };
};

// A doctor can have at most MAX_APPOINTMENTS_PER_DAY non-cancelled appointments per day
const assertDoctorHasCapacity = async ({ doctorId, date }) => {
  const counts = await Promise.all(
    ACTIVE_STATUSES.map((status) =>
      repo.count({ doctor_id: doctorId, date, status }),
    ),
  );
  const countAppointmentForDoctorInThatDay = counts.reduce((a, b) => a + b, 0);

  if (countAppointmentForDoctorInThatDay >= MAX_APPOINTMENTS_PER_DAY) {
    throw new AppError("Doctor has enough appointments for this day", 409);
  }
};

// Validates the appointment date (format + not in the past)
const validateSchedule = ({ date }) => {
  if (typeof date !== "string" || !DATE_RE.test(date))
    throw new AppError("Invalid appointment_date, expected YYYY-MM-DD", 400);

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime()))
    throw new AppError("Invalid appointment_date", 400);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today)
    throw new AppError("Cannot schedule an appointment in the past", 400);

  return { date };
};

const assertValidStatus = (status) => {
  if (status && !ALLOWED_STATUSES.includes(status))
    throw new AppError(
      `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      400,
    );
};

const getAll = async ({ page, limit, ...filters }) => {
  const [items, total] = await Promise.all([
    repo.findAll({ ...toSkipTake({ page, limit }), ...filters }),
    repo.count(filters),
  ]);
  return { data: items.map(toDto), meta: buildMeta({ page, limit, total }) };
};

const getById = async (id) => {
  const appointment = await repo.findById(id);
  if (!appointment) throw new AppError("Appointment not found", 404);
  return toDto(appointment);
};

const MyAppointments = async (userId) => {
  if (!userId) {
    throw new AppError("user id must be provided", 400);
  }

  const appointments = await repo.findByUserId(userId);

  return { data: appointments?.map(toDto) };
};

const create = async (body) => {
  // 1) Required fields
  if (!body.doctor_id || !body.patient_id)
    throw new AppError("Both doctor_id and patient_id must be provided", 400);

  if (!body.appointment_date)
    throw new AppError("appointment_date is required", 400);

  // 2) Validation
  validateSchedule({ date: body.appointment_date });
  assertValidStatus(body.status);

  // 3) Entities exist
  const [doctor, patient] = await Promise.all([
    doctorRepo.findById(body.doctor_id),
    patientRepo.findById(body.patient_id),
  ]);

  if (!doctor) throw new AppError("Doctor not found", 404);
  if (!patient) throw new AppError("Patient not found", 404);

  // 4) Doctor capacity (skip for cancelled appointments)
  if (body.status !== "cancelled") {
    await assertDoctorHasCapacity({
      doctorId: doctor.id,
      date: body.appointment_date,
    });
  }

  const upcomingAppointment = await repo.doesThePatientHaveUpcomingAppointment({
    patientId: patient.id,
    doctorId: doctor.id,
  });
  if (upcomingAppointment) {
    throw new AppError(
      "patient has upcoming appointment with doctor id " + doctor.id,
      409,
    );
  }

  // 5) Create
  // NOTE: steps 4 + 5 are not atomic. Under concurrency two requests can both
  // pass the capacity check. To fully prevent that, wrap them in a serializable
  // transaction.
  const created = await repo.create({
    patient_id: patient.id,
    doctor_id: doctor.id,
    appointment_date: toDate(body.appointment_date),
    status: body.status, // DB default: "pending"
    reason: body.reason ?? null,
    fee: body.fee ?? doctor.fee, // default: doctor's fee
  });

  return toDto(created);
};

const update = async (id, body) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Appointment not found", 404);

  assertValidStatus(body.status);

  if (TERMINAL_STATUSES.includes(existing.status)) {
    throw new AppError(
      `Cannot reschedule a ${existing.status} appointment`,
      400,
    );
  }

  const existingDate = fmtDate(existing.appointment_date);
  const date = body.appointment_date ?? existingDate;
  const dateChanged =
    !!body.appointment_date && body.appointment_date !== existingDate;

  if (dateChanged) validateSchedule({ date });

  const newStatus = body.status ?? existing.status;
  const becomesActive =
    existing.status === "cancelled" && newStatus !== "cancelled";

  // The existing appointment is never counted against itself here:
  // if the date changed, it's on a different day; if it becomes active,
  // it was cancelled so it isn't in the active count.
  if (newStatus !== "cancelled" && (dateChanged || becomesActive)) {
    await assertDoctorHasCapacity({
      doctorId: existing.doctor_id,
      date,
    });
  }

  const data = {};
  if (dateChanged) data.appointment_date = toDate(body.appointment_date);

  if (body.status) data.status = body.status;
  if (body.reason !== undefined) data.reason = body.reason;
  if (body.fee !== undefined) data.fee = body.fee;

  return toDto(await repo.update(id, data));
};

const updateStatus = async (id, status) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Appointment not found", 404);

  assertValidStatus(status);

  const newStatus = status ?? existing.status;

  // Re-activating a cancelled appointment must respect the daily limit
  if (existing.status === "cancelled" && newStatus !== "cancelled") {
    await assertDoctorHasCapacity({
      doctorId: existing.doctor_id,
      date: fmtDate(existing.appointment_date),
    });
  }

  const appointment = await repo.updateStatus(id, newStatus);

  return toDto(appointment);
};

const remove = async (id) => {
  await getById(id);
  await repo.remove(id);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  MyAppointments,
  updateStatus,
  assertValidStatus,
  validateSchedule,
  assertDoctorHasCapacity,
  toDto,
};
