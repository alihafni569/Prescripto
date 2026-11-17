const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// ---------- Cookie Configuration ----------

const getCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
});

const setTokenCookie = (res, token, rememberMe = false) => {
  res.cookie("token", token, getCookieOptions(rememberMe));
};

// Multer puts the uploaded image in req.file, so merge it into person
const buildRegisterBody = (req) => ({
  ...req.body,
  person: { ...req.body.person, image: req.file },
});

// ---------- Login ----------

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body || {};

  const result = await authService.login(email, password, rememberMe === true);

  setTokenCookie(res, result.token, result.rememberMe);

  return res.status(200).json({
    success: true,
    user: result.user,
  });
});

// ---------- Current User ----------

const me = asyncHandler(async (req, res) => {
  // User ID comes from the authentication middleware.
  const id = req.userId;

  if (!id) {
    throw new AppError("Not authorized", 401);
  }

  const result = await authService.getCurrentUser(id);

  return res.status(200).json({
    success: true,
    user: result.user,
  });
});

// ---------- Update Current User ----------

const update = asyncHandler(async (req, res) => {
  // The id ALWAYS comes from the token, never from req.params,
  // so a user can only ever update their own account.
  const id = req.userId;

  if (!id) {
    throw new AppError("Not authorized", 401);
  }

  const body = req.valid.body; // validated by zod

  // An image-only update has an empty body, so check both
  if (!req.file && Object.keys(body).length === 0) {
    throw new AppError("No fields provided to update", 400);
  }

  // Merge the Multer image AFTER validation (zod does not know about req.file)
  const data = req.file
    ? { ...body, person: { ...body.person, image: req.file } }
    : body;

  const result = await authService.update(id, data);

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: result.user,
  });
});

// ---------- Logout ----------

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", getCookieOptions(false));

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// ---------- Patient Registration ----------

const patientRegister = asyncHandler(async (req, res) => {
  const result = await authService.patientRegister(buildRegisterBody(req));

  setTokenCookie(res, result.token, false);

  return res.status(201).json({
    success: true,
    message: "Patient account created successfully",
    user: result.user,
  });
});

// ---------- Doctor Registration ----------

const doctorRegister = asyncHandler(async (req, res) => {
  const result = await authService.doctorRegister(buildRegisterBody(req));

  setTokenCookie(res, result.token, false);

  return res.status(201).json({
    success: true,
    message: "Doctor account created successfully",
    user: result.user,
  });
});

// ---------- Exports ----------

module.exports = {
  login,
  me,
  update,
  logout,
  patientRegister,
  doctorRegister,
};
