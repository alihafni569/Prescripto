const { toDate, fmtDate } = require("./datetime");

// API input -> Prisma data (birthdate string -> Date)
const buildPersonData = (person) => {
  const data = { ...person };
  if ("birthdate" in data) data.birthdate = toDate(data.birthdate);
  return data;
};

// Prisma row -> API output (birthdate Date -> "YYYY-MM-DD")
const serializePerson = (person) =>
  person ? { ...person, birthdate: fmtDate(person.birthdate) } : person;

// Case-insensitive on SQL Server by default collation
const personSearchFilter = (search) => ({
  OR: [
    { name: { contains: search } },
    { email: { contains: search } },
    { phone: { contains: search } },
  ],
});

module.exports = { buildPersonData, serializePerson, personSearchFilter };
