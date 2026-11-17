const prisma = require("../lib/prisma");
const { Prisma } = require("@prisma/client");
const { toDate } = require("../utils/datetime");

const include = {
  Doctor: {
    select: {
      id: true,
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
      Specialization: { select: { id: true, name: true } },
    },
  },
  Patient: {
    select: {
      id: true,
      People: { select: { id: true, name: true } },
    },
  },
};

// Prisma is strict about types: ids coming from req.params / req.query are strings
const toInt = (value) =>
  value === undefined || value === null || value === ""
    ? undefined
    : Number(value);

const buildWhere = ({ doctor_id, patient_id, status, date, from, to }) => {
  const where = {};

  const doctorId = toInt(doctor_id);
  const patientId = toInt(patient_id);
  if (doctorId !== undefined) where.doctor_id = doctorId;
  if (patientId !== undefined) where.patient_id = patientId;
  if (status) where.status = status;

  if (date) {
    where.appointment_date = toDate(date);
  } else if (from || to) {
    where.appointment_date = {
      ...(from ? { gte: toDate(from) } : {}),
      ...(to ? { lte: toDate(to) } : {}),
    };
  }
  return where;
};

const findAll = ({ skip, take, ...filters }) =>
  prisma.appointment.findMany({
    where: buildWhere(filters),
    skip,
    take,
    include,
    orderBy: [{ appointment_date: "desc" }],
  });

const count = (filters) =>
  prisma.appointment.count({ where: buildWhere(filters) });

const findById = (id) =>
  prisma.appointment.findUnique({ where: { id: Number(id) }, include });

// FIX: the original had no `return`, so it always resolved to undefined
const findByUserId = (userId) =>
  prisma.appointment.findMany({
    where: {
      Patient: {
        People: {
          Users: {
            is: {
              id: userId,
            },
          },
        },
      },
    },
    include,
    orderBy: [{ appointment_date: "desc" }],
  });

// First non-cancelled appointment of this doctor overlapping  on that date
const findConflict = async ({ doctorId, date, excludeId }) => {
  const conflicts = await prisma.$queryRaw`
    SELECT TOP 1 *
    FROM appointment
    WHERE doctor_id = ${Number(doctorId)}
      AND appointment_date = CAST(${date} AS DATE)
      AND status <> N'cancelled'
      ${excludeId ? Prisma.sql`AND id <> ${Number(excludeId)}` : Prisma.empty}
  `;

  return conflicts[0] ?? null;
};

const doesThePatientHaveUpcomingAppointment = async ({
  patientId,
  doctorId,
}) => {
  const appointments = await prisma.$queryRaw`
    SELECT TOP 1
      id,
      appointment_date,
      status
    FROM Appointment
    WHERE patient_id = ${patientId}
      AND doctor_id = ${doctorId}
      AND status IN ('pending', 'confirmed')
      AND (
        appointment_date > CAST(GETDATE() AS DATE)
        OR (
          appointment_date = CAST(GETDATE() AS DATE)
        )
      )
  `;

  return appointments[0] ?? null;
};

const create = (data) =>
  prisma.appointment.create({
    data: { ...data, updated_at: new Date() },
    include,
  });

const update = (id, data) =>
  prisma.appointment.update({
    where: { id: Number(id) },
    data: { ...data, updated_at: new Date() },
    include,
  });

const updateStatus = (id, status) =>
  prisma.appointment.update({
    where: { id: Number(id) },
    data: { status: status },
    include,
  });

const remove = (id) => prisma.appointment.delete({ where: { id: Number(id) } });

module.exports = {
  findAll,
  count,
  findById,
  findConflict,
  findByUserId, // old misspelled name kept so existing callers don't break
  create,
  update,
  remove,
  updateStatus,
  doesThePatientHaveUpcomingAppointment,
};
