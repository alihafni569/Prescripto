const toSkipTake = ({ page = 1, limit = 10 } = {}) => ({
  skip: (Number(page) - 1) * Number(limit),
  take: Number(limit),
});

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

module.exports = { toSkipTake, buildMeta };
