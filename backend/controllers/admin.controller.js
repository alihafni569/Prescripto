const service = require("../services/admin.service");
const asyncHandler = require("../utils/asyncHandler");

const getDashboard = asyncHandler(async (req, res) => {
  const data = await service.getDashboardStats();

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = { getDashboard };
