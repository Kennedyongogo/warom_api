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

exports.social = asyncHandler(async (req, res) => {
  try {
    const result = await authService.loginWithSocial(req.body);
    return ok(res, result, "Logged in");
  } catch (err) {
    return fail(res, err.message, 400);
  }
});

exports.me = asyncHandler(async (req, res) => {
  return ok(res, req.user);
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.body?.device_token) {
    await authService.removeDeviceToken(req.user, req.body.device_token);
  }
  await req.user.update({ is_online: false, last_active_at: new Date() });
  return ok(res, null, "Logged out");
});

exports.registerDevice = asyncHandler(async (req, res) => {
  try {
    const tokens = await authService.registerDeviceToken(req.user, req.body);
    return ok(res, { device_tokens: tokens.length }, "Device registered");
  } catch (err) {
    return fail(res, err.message, 400);
  }
});

exports.removeDevice = asyncHandler(async (req, res) => {
  try {
    const token = req.body?.token || req.params.token;
    const tokens = await authService.removeDeviceToken(req.user, token);
    return ok(res, { device_tokens: tokens.length }, "Device removed");
  } catch (err) {
    return fail(res, err.message, 400);
  }
});
