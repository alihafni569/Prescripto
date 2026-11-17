// Prisma needs Date objects for @db.Date / @db.Time columns.
// API uses plain strings: "YYYY-MM-DD" and "HH:mm".

const toDate = (v) => {
  if (v instanceof Date) return v;

  if (typeof v !== "string") {
    throw new Error("Invalid appointment date");
  }

  // Accept both date-only and full ISO datetime strings.
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00.000Z` : v,
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid appointment date");
  }

  return date;
};

const toTime = (v) => {
  if (v instanceof Date) return v;

  if (typeof v !== "string") {
    throw new Error("Invalid appointment time");
  }

  // Accept HH:mm or HH:mm:ss.
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(v);

  if (!match) {
    throw new Error(`Invalid appointment time: ${v}`);
  }

  const [, hours, minutes, seconds = "00"] = match;

  return new Date(`1970-01-01T${hours}:${minutes}:${seconds}.000Z`);
};

const fmtDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);

const fmtTime = (d) => (d instanceof Date ? d.toISOString().slice(11, 19) : d);

module.exports = { toDate, toTime, fmtDate, fmtTime };
