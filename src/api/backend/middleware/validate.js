export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const err = new Error("Validation error");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    err.details = result.error.flatten();
    return next(err);
  }

  req.validated = result.data;
  next();
};
