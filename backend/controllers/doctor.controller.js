const crudController = require("../utils/crudController");
const asyncHandler = require("../utils/asyncHandler");

const service = require("../services/doctor.service");
const appointmentService = require("../services/appointment.service");

const getDashboard = asyncHandler(async (req, res) => {
  try {
    // taken from the verified JWT, not from the URL
    const userId = req.userId;

    const doctor = await service.getByUserId(userId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const data = await service.getDashboardStats(doctor.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("getDashboard error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
});

const getDoctorAppointments = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const doctor = await service.getByUserId(userId);
  const { page, limit } = req.query;

  const result = await appointmentService.getAll({
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    doctor_id: doctor.id,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

module.exports = {
  ...crudController(require("../services/doctor.service")),
  getDashboard,
  getDoctorAppointments,
};
