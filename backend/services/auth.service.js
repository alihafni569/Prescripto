const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const repo = require("../repositories/users.repository");
const AppError = require("../utils/AppError");

const { uploadImage, deleteImage } = require("../services/cloudinary.service");

// ---------- Constants ----------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PASSWORD = 8;
const MAX_PASSWORD_BYTES = 72;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// ---------- Authentication ----------

const ensureSecretKey = () => {
  if (!process.env.SECRET_KEY) {
    throw new Error("SECRET_KEY is not configured");
  }
};

const createToken = (userId, role, personId, rememberMe = false) => {
  ensureSecretKey();

  return jwt.sign(
    {
      userId,
      role,
      personId,
    },
    process.env.SECRET_KEY,
    {
      expiresIn: rememberMe ? "30d" : "1d",
    },
  );
};

// Never expose password or sensitive database fields.
const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  isActive: user.isActive,
  role: user.role,
  People: user.People,
});

// ---------- Login ----------

const login = async (email, password, rememberMe = false) => {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError("Invalid credentials", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError("Invalid email format", 400);
  }

  const user = await repo.findByEmail(normalizedEmail);

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("This account is deactivated", 403);
  }

  const token = createToken(user.id, user.role, user.person_id, rememberMe);

  return {
    user: toPublicUser(user),
    token,
    rememberMe,
  };
};

// ---------- Current User ----------

const getCurrentUser = async (id) => {
  const user = await repo.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.isActive) {
    throw new AppError("This account is deactivated", 403);
  }

  return {
    user: toPublicUser(user),
  };
};

// ---------- Common Validation ----------

// Expected body: { email?, password, person, profile }
const validateCommon = ({ person, password } = {}) => {
  if (!person) {
    throw new AppError("Person information is required", 400);
  }

  if (!person.name || !person.email || !person.phone || !person.gender) {
    throw new AppError("Missing person fields", 400);
  }

  if (
    typeof person.email !== "string" ||
    !EMAIL_REGEX.test(person.email.trim())
  ) {
    throw new AppError("Invalid email format", 400);
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    throw new AppError(
      `Password must be at least ${MIN_PASSWORD} characters`,
      400,
    );
  }

  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new AppError("Password must not exceed 72 bytes", 400);
  }
};

// ---------- Person Data ----------

const buildPerson = (person) => ({
  name: person.name.trim(),
  email: person.email.trim().toLowerCase(),
  phone: person.phone.trim(),
  gender: person.gender,
  birthdate: person.birthdate || null,
  image: person.image || null,
});

// ---------- Image Handling ----------

// Accepts a Multer file or Base64 data URL.
const parseImage = (image) => {
  if (!image) return null;

  // Multer file (requires multer memoryStorage)
  if (image.buffer) {
    if (!Buffer.isBuffer(image.buffer)) {
      throw new AppError("Invalid image buffer", 400);
    }

    if (!ALLOWED_IMAGE_TYPES.includes(image.mimetype)) {
      throw new AppError("Image must be a JPEG, PNG or WebP file", 400);
    }

    if (image.buffer.length === 0 || image.buffer.length > MAX_IMAGE_BYTES) {
      throw new AppError("Image must be smaller than 5 MB", 400);
    }

    return image.buffer;
  }

  // Base64 data URL
  if (typeof image !== "string") {
    throw new AppError("Invalid image", 400);
  }

  const match = image.match(
    /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/]+={0,2})$/i,
  );

  if (!match) {
    throw new AppError("Invalid image format", 400);
  }

  const mimeType = match[1].toLowerCase();

  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new AppError("Image must be a JPEG, PNG or WebP file", 400);
  }

  const buffer = Buffer.from(match[2], "base64");

  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError("Image must be smaller than 5 MB", 400);
  }

  return buffer;
};

// ---------- Cloudinary ----------

const uploadPersonImage = async (person, folder) => {
  const buffer = parseImage(person.image);

  const personData = { ...person };

  // Never save the raw Base64 data or Multer object.
  delete personData.image;

  if (!buffer) {
    return {
      personData,
      uploaded: null,
    };
  }

  const uploaded = await uploadImage(buffer, folder);

  personData.image = uploaded.secure_url;

  return {
    personData,
    uploaded,
  };
};

// Rollback uploaded image if database creation fails.
const rollbackImage = async (uploaded) => {
  if (!uploaded?.public_id) return;

  try {
    await deleteImage(uploaded.public_id);
  } catch (err) {
    console.error("Failed to roll back uploaded image:", err.message);
  }
};

// ---------- Registration Helper ----------

const registerAccount = async ({
  person,
  profile,
  password,
  createAccount,
  folder,
}) => {
  // Check configuration before uploading anything.
  ensureSecretKey();

  const passwordHash = await bcrypt.hash(password, 10);

  const { personData, uploaded } = await uploadPersonImage(person, folder);

  let result;

  try {
    result = await createAccount({
      person: buildPerson(personData),
      profile,
      passwordHash,
    });
  } catch (err) {
    await rollbackImage(uploaded);
    throw err;
  }

  const token = createToken(
    result.user.id,
    result.user.role,
    result.person.id,
    false,
  );
  result.user.People = result.person;

  return {
    user: toPublicUser(result.user),
    token,
  };
};

// ---------- Patient Registration ----------

const patientRegister = async (body) => {
  validateCommon(body);

  const { person, profile, password } = body;

  if (!profile?.bloodType) {
    throw new AppError("Missing patient fields", 400);
  }

  return registerAccount({
    person,
    profile,
    password,

    createAccount: (data) => repo.createPatientAccount(data),

    folder: "prescripto/patients",
  });
};

// ---------- Doctor Registration ----------

const doctorRegister = async (body) => {
  validateCommon(body);

  const { person, profile, password } = body;

  if (
    profile?.specialization_id == null ||
    !profile?.degree ||
    profile?.experience == null ||
    !profile?.about ||
    profile?.fee == null
  ) {
    throw new AppError("Missing doctor fields", 400);
  }

  return registerAccount({
    person,
    profile,
    password,

    createAccount: (data) => repo.createDoctorAccount(data),

    folder: "prescripto/doctors",
  });
};

// ---------- Exports ----------
const update = async (id, body) => {
  const user = await repo.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { person, email, password } = body;

  // Prepare Users table data.
  const userData = {};

  // Prepare People table data.
  const personData = {};

  if (person) {
    if (person.name !== undefined) {
      personData.name = person.name.trim();
    }

    if (person.phone !== undefined) {
      personData.phone = person.phone.trim();
    }

    if (person.gender !== undefined) {
      personData.gender = person.gender;
    }

    if (person.birthdate !== undefined) {
      personData.birthdate = person.birthdate
        ? new Date(person.birthdate)
        : null;
    }

    if (person.email !== undefined) {
      const normalizedEmail = person.email.trim().toLowerCase();

      personData.email = normalizedEmail;
      userData.email = normalizedEmail;
    }
  }

  if (email !== undefined) {
    userData.email = email.trim().toLowerCase();
  }

  if (password) {
    userData.password = await bcrypt.hash(password, 10);
  }

  let uploaded = null;

  try {
    // Upload new image to Cloudinary.
    if (person.image) {
      const image = person.image;
      const result = await uploadPersonImage({ image }, "prescripto/users");

      uploaded = result.uploaded;

      personData.image = result.personData.image;
    }

    // Update Users and People atomically.
    const updatedUser = await repo.updateWithPerson(id, {
      userData,
      personData,
    });

    return {
      user: updatedUser,
    };
  } catch (error) {
    // Remove uploaded image if database update fails.
    await rollbackImage(uploaded);

    throw error;
  }
};
module.exports = {
  login,
  getCurrentUser,
  patientRegister,
  doctorRegister,
  update,
};
