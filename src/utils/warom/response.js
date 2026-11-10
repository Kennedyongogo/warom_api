const ok = (res, data = null, message = "OK", status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, message = "Request failed", status = 400, errors = null) =>
  res.status(status).json({ success: false, message, errors });

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ok, fail, asyncHandler };
