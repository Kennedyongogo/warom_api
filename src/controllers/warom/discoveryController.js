const discoveryService = require("../../services/warom/discoveryService");
const { ok, asyncHandler } = require("../../utils/warom/response");

exports.home = asyncHandler(async (req, res) => {
  const data = await discoveryService.homeFeed(req.userId, {
    limit: Number(req.query.limit) || 40,
  });
  return ok(res, data);
});

exports.discover = asyncHandler(async (req, res) => {
  const data = await discoveryService.discoverByLocation(req.userId, {
    country: req.query.country,
    city: req.query.city,
    limit: Number(req.query.limit) || 40,
  });
  return ok(res, data);
});
