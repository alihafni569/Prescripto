const repository = require("../repositories/admin.repository");

const getDashboardStats = async () => {
  return await repository.getStats();
};

module.exports = { getDashboardStats };
