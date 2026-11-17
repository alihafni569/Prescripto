const validate = (schemas) => (req, res, next) => {
  try {
    req.valid = {
      params: {},
      query: {},
      body: {},
    };

    for (const key of ["params", "query", "body"]) {
      if (schemas[key]) {
        req.valid[key] = schemas[key].parse(req[key]);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;
