export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || "Internal error",
      code: err.code || "INTERNAL_ERROR",
    },
  });
}
