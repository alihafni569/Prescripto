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
  Specialization: { select: { id: true, name: true } },
};

const buildWhere = ({ specialization_id, search }) => ({
  ...(specialization_id
    ? { Specialization: { is: { id: specialization_id } } }
    : {}),
  ...(search ? { People: { is: personSearchFilter(search) } } : {}),
});

const findAll = ({ skip, take, ...filters }) =>
  prisma.doctor.findMany({
    where: buildWhere(filters),
    skip,
    take,
    include,
    orderBy: { id: "asc" },
  });

const count = (filters) => prisma.doctor.count({ where: buildWhere(filters) });

const findById = (id) => prisma.doctor.findUnique({ where: { id }, include });

// Creates the person (when given inline) and the doctor in one transaction.
// `image` lives on People, not Doctor, so it is routed to the person row.
const createWithPerson = ({
  person,
  person_id,
  specialization_id,
  image,
  ...doctor
}) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    let personId = person_id;

    if (person) {
      const created = await tx.people.create({
        data: {
          ...buildPersonData(person),
          ...(image !== undefined && { image }),
          updated_at: now,
        },
      });
      personId = created.id;
    } else if (image !== undefined && personId) {
      await tx.people.update({
        where: { id: personId },
        data: { image, updated_at: now },
      });
    }

    return tx.doctor.create({
      data: {
        ...doctor,
        People: { connect: { id: personId } },
        Specialization: { connect: { id: specialization_id } },
        created_at: now,
        updated_at: now,
      },
      include,
    });
  });

// Updates doctor fields and (optionally) the linked person in one transaction.
// `image` is saved on the person row.
const updateWithPerson = (
  id,
  personId,
  { person, specialization_id, image, ...doctor },
) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();

    const hasPersonFields = person && Object.keys(person).length > 0;
    const hasImage = image !== undefined;

    if (hasPersonFields || hasImage) {
      await tx.people.update({
        where: { id: personId },
        data: {
          ...(hasPersonFields ? buildPersonData(person) : {}),
          ...(hasImage && { image }),
          updated_at: now,
        },
      });
    }

    return tx.doctor.update({
      where: { id },
      data: {
        ...doctor,
        ...(specialization_id !== undefined && {
          Specialization: { connect: { id: specialization_id } },
        }),
        updated_at: now,
      },
      include,
    });
  });

const findByPersonId = (personId) =>
  prisma.doctor.findFirst({
    where: { person_id: personId },
    include,
  });

// Removes only the doctor row; the person stays (delete it via /people)
const remove = (id) => prisma.doctor.delete({ where: { id } });

const getDashboardStats = async (doctorId) => {
  const [
    appointmentsCount,
    pendingCount,
    confirmedCount,
    completedCount,
    cancelledCount,
    latestAppointments,
  ] = await Promise.all([
    prisma.appointment.count({ where: { doctor_id: doctorId } }),

    prisma.appointment.count({
      where: { status: "pending", doctor_id: doctorId },
    }),

    prisma.appointment.count({
      where: { status: "confirmed", doctor_id: doctorId },
    }),

    prisma.appointment.count({
      where: { status: "completed", doctor_id: doctorId },
    }),

    prisma.appointment.count({
      where: { status: "cancelled", doctor_id: doctorId },
    }),

    prisma.appointment.findMany({
      take: 5,
      orderBy: {
        created_at: "desc",
      },
      where: { doctor_id: doctorId },
      include: {
        Patient: {
          include: {
            People: true,
          },
        },
        Doctor: {
          include: {
            People: true,
          },
        },
      },
    }),
  ]);

  return {
    appointmentsCount,
    pendingCount,
    confirmedCount,
    completedCount,
    cancelledCount,
    latestAppointments,
  };
};

const findByUserId = (userId) => {
  return prisma.doctor.findFirst({
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

const getDoctorAppointments = async (
  doctorId,
  { skip = 0, take = 10 } = {},
) => {
  const where = { doctor_id: doctorId };

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip: Number(skip),
      take: Number(take),
      orderBy: { created_at: "desc" },
      include: {
        Patient: {
          include: { People: true },
        },
        Doctor: {
          include: { People: true },
        },
      },
    }),

    prisma.appointment.count({ where }),
  ]);

  return { items, total };
};

const getAppointmentCountsByDate = (doctorId, startDate, endDate) =>
  prisma.appointment.groupBy({
    by: ["appointment_date"],
    where: {
      doctor_id: Number(doctorId),
      appointment_date: {
        gte: startDate,
        lt: endDate,
      },
      status: {
        not: "cancelled",
      },
    },
    _count: {
      _all: true,
    },
  });

module.exports = {
  findAll,
  count,
  findById,
  createWithPerson,
  updateWithPerson,
  remove,
  getDashboardStats,
  findByUserId,
  getDoctorAppointments,
  findByPersonId,
  getAppointmentCountsByDate,
};
