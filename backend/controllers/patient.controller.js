const crudController = require("../utils/crudController");

module.exports = crudController(require("../services/patient.service"));
