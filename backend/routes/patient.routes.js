const router = require("express").Router();
const c = require("../controllers/patient.controller");
const validate = require("../middlewares/validate");
const v = require("../validators/patient.validator");
const { idParam } = require("../validators/common");
const auth = require("../middlewares/auth.middleware");
const {
  authorizeOwner,
  authorize,
  patientOwner,
} = require("../middlewares/authorize");

router.get(
  "/",
  auth,
  authorize("admin"),
  validate({ query: v.listPatients }),
  c.getAll,
);
router.get(
  "/:id",
  auth,
  authorizeOwner(patientOwner, "admin"),
  validate({ params: idParam }),
  c.getById,
);
router.post(
  "/",
  auth,
  authorize("admin"),
  validate({ body: v.createPatient }),
  c.create,
);
router.patch(
  "/:id",
  auth,
  authorizeOwner(patientOwner, "admin"),
  validate({ params: idParam, body: v.updatePatient }),
  c.update,
);
router.delete(
  "/:id",
  auth,
  authorizeOwner(patientOwner, "admin"),
  validate({ params: idParam }),
  c.remove,
);

module.exports = router;
