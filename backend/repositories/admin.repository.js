const prisma = require("../lib/prisma");

const getStats = async () => {
  const [
    patientsCount,
    doctorsCount,
    appointmentsCount,
    pendingCount,
    confirmedCount,
    completedCount,
    cancelledCount,
    latestAppointments,
  ] = await Promise.all([
    prisma.patient.count(),

    prisma.doctor.count(),

    prisma.appointment.count(),

    prisma.appointment.count({
      where: { status: "pending" },
    }),

    prisma.appointment.count({
      where: { status: "confirmed" },
    }),

    prisma.appointment.count({
      where: { status: "completed" },
    }),

    prisma.appointment.count({
      where: { status: "cancelled" },
    }),

    prisma.appointment.findMany({
      take: 5,
      orderBy: {
        created_at: "desc",
      },
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
    patientsCount,
    doctorsCount,
    appointmentsCount,
    pendingCount,
    confirmedCount,
    completedCount,
    cancelledCount,
    latestAppointments,
  };
};

module.exports = { getStats };
