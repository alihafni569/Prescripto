const crudController = require("../utils/crudController");
const service = require("../services/appointment.service");
const asyncHandler = require("../utils/asyncHandler");
const patiant = require("../repositories/patient.repository");
const AppError = require("../utils/AppError");
const doctorService = require("../services/doctor.service");
const patientService = require("../services/patient.service");

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const appointment = await service.updateStatus(id, status);

  res.status(200).json({
    success: true,
    data: appointment,
  });
});

const createAppointment = asyncHandler(async (req, res) => {
  const body = { ...req.valid.body };

  if (body.patient_id == null) {
    const userId = req.body.user_id;

    const patient = await patiant.findByUserId(userId);

    if (!patient) {
      throw new AppError("Patient not found", 404);
    }

    body.patient_id = patient.id;
  }

  const appointment = await service.create(body);

  res.status(201).json({
    status: true,
    data: appointment,
  });
});

const getDoctorAppointments = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getByPersonId(req.user.person_id);
  const { page, limit } = req.query;

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  const result = await service.getAll({
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

const getPatientAppointments = asyncHandler(async (req, res) => {
  const patient = await patientService.getByPersonId(req.user.person_id);
  const { page, limit } = req.query;

  if (!patient) {
    throw new AppError("Patient not found", 404);
  }

  const result = await service.getAll({
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    patient_id: patient.id,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});
module.exports = {
  ...crudController(service),
  updateStatus,
  createAppointment,
  getDoctorAppointments,
  getPatientAppointments,
};
