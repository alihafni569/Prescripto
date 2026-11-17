const router = require("express").Router();
const validate = require("../middlewares/validate");
const controller = require("../controllers/admin.controller");
const appointmentController = require("../controllers/appointment.controller");
const { idParam } = require("../validators/common");
const v = require("../validators/appointment.validator");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/authorize");

router.get(
  "/dashboard",
  authMiddleware,
  authorize("admin"),
  controller.getDashboard,
);

module.exports = router;
