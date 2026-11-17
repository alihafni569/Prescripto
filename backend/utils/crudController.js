const asyncHandler = require("./asyncHandler");

// Builds the 5 standard handlers from a service exposing:
// getAll(query), getById(id), create(body), update(id, body), remove(id)
// Input is already validated by the `validate` middleware (req.valid.*)
const crudController = (service) => ({
  getAll: asyncHandler(async (req, res) => {
    res.json(await service.getAll(req.valid.query));
  }),

  getMyAppointments: asyncHandler(async (req, res) => {
    res.json(await service.MyAppointments(req.userId));
  }),

  getById: asyncHandler(async (req, res) => {
    res.json(await service.getById(req.valid.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    res.status(201).json({
      success: true,
      data: await service.create({
        ...req.valid.body,
        image: req.file,
      }),
    });
  }),

  update: asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      data: await service.update(req.params.id, {
        ...req.valid.body,
        image: req.file,
      }),
    });
  }),

  remove: asyncHandler(async (req, res) => {
    await service.remove(req.valid.params.id);
    res.status(200).json({ success: true, message: "deleted successfully" });
  }),
});

module.exports = crudController;
