const router = require("express").Router();

router.use("/specializations", require("./specialization.routes"));
router.use("/doctors", require("./doctor.routes"));
router.use("/patients", require("./patient.routes"));
router.use("/appointments", require("./appointment.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/admin", require("./admin.routes"));

module.exports = router;
