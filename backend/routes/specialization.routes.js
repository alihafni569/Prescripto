const router = require("express").Router();
const c = require("../controllers/specialization.controller");
const validate = require("../middlewares/validate");
const v = require("../validators/specialization.validator");
const { idParam } = require("../validators/common");
const auth = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/authorize");

router.get("/", validate({ query: v.listSpecializations }), c.getAll);
router.get("/:id", validate({ params: idParam }), c.getById);
router.post(
  "/",
  auth,
  authorize("admin"),
  validate({ body: v.createSpecialization }),
  c.create,
);
router.patch(
  "/:id",
  auth,
  authorize("admin"),
  validate({ params: idParam, body: v.updateSpecialization }),
  c.update,
);
router.delete(
  "/:id",
  auth,
  authorize("admin"),
  validate({ params: idParam }),
  c.remove,
);

module.exports = router;
