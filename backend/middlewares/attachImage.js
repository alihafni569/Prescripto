// middlewares/attachImage.js
const attachImage = (req, _res, next) => {
  if (req.file) {
    req.body.person = { ...(req.body.person ?? {}), image: req.file };
  }
  next();
};

module.exports = attachImage;
