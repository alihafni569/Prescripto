const { z } = require("zod");
const {
  paginationShape,
  dateString,
  nonEmpty,
  nonEmptyMessage,
} = require("./common");

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const reason = z.string().trim().max(500).nullable().optional();

const createAppointment = z.object({
  patient_id: z.number().int().positive().optional(),
  user_id: z.number().int().positive().optional(),
  doctor_id: z.number().int().positive(),
  appointment_date: dateString,
  status: z.enum(STATUSES).optional(),
  reason,
  fee: z.number().nonnegative().max(99999999.99).optional(), // defaults to the doctor's fee
});

// patient/doctor can't be changed: cancel and rebook instead
const updateAppointment = z
  .object({
    appointment_date: dateString,
    status: z.enum(STATUSES),
    reason,
    fee: z.number().nonnegative().max(99999999.99),
  })
  .partial()
  .refine(nonEmpty, nonEmptyMessage);

const listAppointments = z.object({
  ...paginationShape,
  doctor_id: z.coerce.number().int().positive().optional(),
  patient_id: z.coerce.number().int().positive().optional(),
  status: z.enum(STATUSES).optional(),
  date: dateString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});

module.exports = {
  createAppointment,
  updateAppointment,
  listAppointments,
};
