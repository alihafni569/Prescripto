const router = require("express").Router();
const c = require("../controllers/appointment.controller");
const validate = require("../middlewares/validate");
const v = require("../validators/appointment.validator");
const { idParam } = require("../validators/common");
const auth = require("../middlewares/auth.middleware");
const {
  authorizeOwner,
  appointmentParticipants,
  authorize,
} = require("../middlewares/authorize");
const { bookingLimiter } = require("../middlewares/rateLimiting");

// List all appointments: admin only (there is no :id, so no ownership to check)
router.get(
  "/",
  auth,
  authorize("admin"),
  validate({ query: v.listAppointments }),
  c.getAll,
);

// Put specific routes before parameterized routes

// "My appointments": role check only, the controller uses req.user.person_id
router.get("/patient-appointments", auth, c.getPatientAppointments);

router.get(
  "/doctor-appointments",
  auth,
  authorize("doctor", "admin"),
  c.getDoctorAppointments,
);

// Admin viewing a specific doctor's appointments
router.get(
  "/doctor-appointments/:id",
  auth,
  authorize("admin"),
  validate({ params: idParam }),
  c.getDoctorAppointments,
);

router.get(
  "/:id",
  auth,
  validate({ params: idParam }),
  authorizeOwner(appointmentParticipants, "admin"),
  c.getById,
);

router.post(
  "/",
  auth,
  bookingLimiter,
  validate({ body: v.createAppointment }),
  c.createAppointment,
);

router.patch(
  "/status/:id",
  auth,
  bookingLimiter,
  validate({ params: idParam, body: v.updateAppointment }),
  authorizeOwner(appointmentParticipants, "admin"),
  c.updateStatus,
);

router.delete(
  "/:id",
  auth,
  bookingLimiter,
  validate({ params: idParam }),
  authorizeOwner(appointmentParticipants, "admin"),
  c.remove,
);

module.exports = router;
