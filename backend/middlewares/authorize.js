const prisma = require("../lib/prisma"); // adjust to your shared PrismaClient instance

/**
 * Requirements:
 *  - `authenticate` runs first and sets req.user = { id, person_id, role }
 *    (put person_id in the JWT payload at login).
 *
 * Ownership model (from the Prisma schema):
 *   Users.person_id  ->  People.id  <-  Doctor.person_id / Patient.person_id
 * So ownership is always compared by person_id, never by Users.id / Doctor.id.
 */

const deny = (res, status, message) =>
  res.status(status).json({ success: false, message });

/* ------------------------------------------------------------------ */
/* 1) Role-based authorization                                         */
/* ------------------------------------------------------------------ */
const authorize = (...allowedRoles) => {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) return deny(res, 401, "Not authenticated. Please log in.");

    if (!roles.includes(req.user.role)) {
      return deny(
        res,
        403,
        "You do not have permission to access this resource.",
      );
    }

    next();
  };
};

/* ------------------------------------------------------------------ */
/* 2) Ownership authorization                                          */
/* ------------------------------------------------------------------ */
/**
 * authorizeOwner(resolver, ...bypassRoles)
 *
 * - resolver(req) returns the person_id (or an array of person_ids) that
 *   "own" the resource, or null/undefined if the resource does not exist.
 * - bypassRoles (e.g. "admin") skip the ownership check entirely.
 *
 * It takes ONE resolver. To combine several, wrap them with anyOf(...).
 */
const authorizeOwner = (resolver, ...bypassRoles) => {
  if (typeof resolver !== "function") {
    throw new TypeError(
      "authorizeOwner: first argument must be a resolver function (use anyOf(...) to combine several).",
    );
  }

  const roles = bypassRoles.flat();

  // Catch the common mistake: passing a second resolver as a "role".
  if (roles.some((r) => typeof r !== "string")) {
    throw new TypeError(
      "authorizeOwner: roles must be strings. To use several resolvers, wrap them: authorizeOwner(anyOf(a, b), 'admin').",
    );
  }

  return async (req, res, next) => {
    try {
      if (!req.user) return deny(res, 401, "Not authenticated. Please log in.");

      if (roles.includes(req.user.role)) return next();

      const owners = await resolver(req);
      if (owners === null || owners === undefined) {
        return deny(res, 404, "Resource not found.");
      }

      const ownerIds = [].concat(owners).map(Number);
      if (!ownerIds.includes(Number(req.user.person_id))) {
        return deny(
          res,
          403,
          "You do not have permission to access this resource.",
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * anyOf(...resolvers)
 *
 * Combines resolvers: the owners are the union of all results.
 * Returns null only if EVERY resolver returned null (resource not found).
 *
 * WARNING: all resolvers read the same req.params.id. Doctor.id and Patient.id
 * are different tables, so anyOf(doctorOwner, patientOwner) on one :id can match
 * the wrong person. Use it only when :id means the same thing to all resolvers
 * (e.g. appointmentParticipants already does this safely for appointments).
 */
const anyOf =
  (...resolvers) =>
  async (req) => {
    const results = await Promise.all(resolvers.map((resolve) => resolve(req)));

    const found = results.filter((r) => r !== null && r !== undefined);
    if (found.length === 0) return null;

    return found.flat();
  };

/* ------------------------------------------------------------------ */
/* 3) Ready-made resolvers (one per table)                             */
/* ------------------------------------------------------------------ */
const parseId = (req) => {
  const id = Number(req.params.id);
  return Number.isInteger(id) ? id : null;
};

// /doctors/:id  -> owner is the doctor's own person
const doctorOwner = async (req) => {
  const id = parseId(req);
  if (id === null) return null;

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    select: { person_id: true },
  });
  return doctor ? doctor.person_id : null;
};

const patientOwner = async (req) => {
  const id = parseId(req);
  if (id === null) return null;

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { person_id: true },
  });
  return patient ? patient.person_id : null;
};

// /appointments/:id  -> both the doctor and the patient of that appointment
const appointmentParticipants = async (req) => {
  const id = parseId(req);
  if (id === null) return null;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: {
      Doctor: { select: { person_id: true } },
      Patient: { select: { person_id: true } },
    },
  });
  if (!appointment) return null;

  return [appointment.Doctor.person_id, appointment.Patient.person_id];
};

module.exports = {
  authorize,
  authorizeOwner,
  anyOf,
  doctorOwner,
  patientOwner,
  appointmentParticipants,
};
