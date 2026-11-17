const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/multer");
const {
  registerPatient,
  registerDoctor,
  updateUser,
  login,
} = require("../validators/users.validator");
const validate = require("../middlewares/validate");
const attachImage = require("../middlewares/attachImage");

const authController = require("../controllers/auth.controller");
const { authLimiter } = require("../middlewares/rateLimiting");

router.post(
  "/login",
  authLimiter,
  validate({ body: login }),
  authController.login,
);
router.post("/logout", authLimiter, authMiddleware, authController.logout);
router.get("/me", authLimiter, authMiddleware, authController.me);

// multer must run first: it parses the multipart body and fills req.body / req.file
router.post(
  "/patient-register",
  authLimiter,
  upload.single("person[image]"),
  attachImage,
  validate({ body: registerPatient }),
  authController.patientRegister,
);

router.post(
  "/doctor-register",
  authLimiter,
  upload.single("person[image]"),
  attachImage,
  validate({ body: registerDoctor }),
  authController.doctorRegister,
);

// A logged-in user updates their own account (id comes from the token)
router.patch(
  "/me",
  authLimiter,
  authMiddleware,
  upload.single("person[image]"),
  attachImage,
  validate({ body: updateUser }),
  authController.update,
);

module.exports = router;
