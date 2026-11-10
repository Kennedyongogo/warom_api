const authService = require("../../services/warom/authService");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.register = asyncHandler(async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return ok(res, result, "Registered", 201);
  } catch (err) {
    return fail(res, err.message, 400);
  }
});

exports.login = asyncHandler(async (req, res) => {
  try {
    const result = await authService.loginWithEmail(req.body);
    return ok(res, result, "Logged in");
  } catch (err) {
    return fail(res, err.message, 401);
  }
});

exports.me = asyncHandler(async (req, res) => {
  return ok(res, req.user);
});
