const { Report } = require("../../models");
const { ok, fail, asyncHandler } = require("../../utils/warom/response");

exports.create = asyncHandler(async (req, res) => {
  const { reported_user_id, target_type, target_id, reason, details, evidence_urls } =
    req.body;
  if (!reason) return fail(res, "reason is required");
  const report = await Report.create({
    reporter_id: req.userId,
    reported_user_id: reported_user_id || null,
    target_type: target_type || "user",
    target_id: target_id || null,
    reason,
    details: details || null,
    evidence_urls: evidence_urls || [],
  });
  return ok(res, report, "Report submitted", 201);
});
