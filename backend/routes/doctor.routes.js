const router = require("express").Router();
const c = require("../controllers/doctor.controller");
const validate = require("../middlewares/validate");
const v = require("../validators/doctor.validator");
const { idParam } = require("../validators/common");
const upload = require("../middlewares/multer");
const auth = require("../middlewares/auth.middleware");
const {
  authorizeOwner,
  authorize,
  doctorOwner,
} = require("../middlewares/authorize");

const parseDoctorBody = (req, res, next) => {
  try {
    if (req.body.person) {
      req.body.person = JSON.parse(req.body.person);
    }

    const numericFields = ["specialization_id", "experience", "fee"];

    for (const field of numericFields) {
      if (req.body[field] !== undefined) {
        req.body[field] = Number(req.body[field]);
      }
    }

    if (req.body.active !== undefined) {
      req.body.active = req.body.active === "true";
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
    });
  }
};

// A doctor may edit their own profile, but these fields are admin-only.
// Adjust the list to match your business rules.
const ADMIN_ONLY_FIELDS = ["fee", "active", "specialization_id"];

const blockAdminOnlyFields = (req, res, next) => {
  if (req.user.role === "admin") return next();

  const forbidden = ADMIN_ONLY_FIELDS.filter((f) => req.body[f] !== undefined);
  if (forbidden.length > 0) {
    return res.status(403).json({
      success: false,
      message: `Only an admin can change: ${forbidden.join(", ")}`,
    });
  }

  next();
};

router.get("/", validate({ query: v.listDoctors }), c.getAll);

// static routes MUST come before "/:id"
router.get("/dashboard", auth, authorize("doctor"), c.getDashboard);

router.get("/:id", auth, validate({ params: idParam }), c.getById);

router.post(
  "/",
  auth,
  authorize("admin", "doctor"),
  upload.single("image"),
  parseDoctorBody,
  validate({ body: v.createDoctor }),
  c.create,
);

router.patch(
  "/:id",
  auth,
  validate({ params: idParam }),
  authorizeOwner(doctorOwner, "admin"),
  upload.single("image"),
  parseDoctorBody,
  blockAdminOnlyFields,
  validate({ body: v.updateDoctor }),
  c.update,
);

router.delete(
  "/:id",
  auth,
  validate({ params: idParam }),
  authorize("admin"),
  c.remove,
);

module.exports = router;
