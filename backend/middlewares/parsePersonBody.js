const parsePersonBody = (req, res, next) => {
  const body = req.body || {};
  const person = {};

  for (const [key, value] of Object.entries(body)) {
    const match = key.match(/^person\[(.+)\]$/);

    if (match) {
      person[match[1]] = value;
    }
  }

  req.body = {
    ...body,
    person,
  };

  next();
};

module.exports = parsePersonBody;
