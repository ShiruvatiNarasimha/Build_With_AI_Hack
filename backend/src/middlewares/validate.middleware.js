const ApiError = require("../utils/api-error");

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      cookies: req.cookies,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return next(
        new ApiError(400, "Request validation failed.", result.error.flatten()),
      );
    }

    req.validated = result.data;
    return next();
  };
}

module.exports = { validate };
